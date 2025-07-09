import dotenv from 'dotenv';

// Cargar variables de entorno antes que cualquier otra cosa
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Shared services
import { DatabaseConnection } from './shared/database/Connection';
import { LoggerService } from './shared/services/LoggerService';
import { ErrorHandler } from './shared/utils/ErrorUtils';
import { ResponseUtils } from './shared/utils/ResponseUtils';
import { SecurityUtils } from './shared/utils/SecurityUtils';

// Routes
import { userRoutes } from './modules/users/infrastructure/routes/userRoutes';

class Server {
  private app: express.Application;
  private logger: LoggerService;
  private port: number;

  constructor() {
    this.app = express();
    this.logger = LoggerService.getInstance();
    this.port = parseInt(process.env.PORT || '3000');
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Seguridad básica
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'];
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('No permitido por CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compresión
    this.app.use(compression());

    // Logging HTTP
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => {
          this.logger.info(message.trim());
        }
      }
    }));

    // Rate limiting global
    const globalLimiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      message: {
        error: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.',
        retryAfter: '15 minutos'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    this.app.use(globalLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Headers de seguridad personalizados
    this.app.use((req, res, next) => {
      const securityHeaders = SecurityUtils.getSecurityHeaders();
      Object.entries(securityHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      // Request ID para tracking
      res.locals.requestId = SecurityUtils.generateRandomToken(16);
      
      next();
    });

    // Middleware para logging de requests
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.logger.logRequest(
          req.method,
          req.originalUrl,
          res.statusCode,
          duration
        );
      });
      
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check en la raíz
    this.app.get('/health', (req, res) => {
      ResponseUtils.success(res, {
        status: 'ok',
        timestamp: new Date(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.APP_VERSION || '1.0.0'
      }, 'API funcionando correctamente');
    });

    // Información de la API
    this.app.get('/api', (req, res) => {
      ResponseUtils.success(res, {
        name: 'Voyaj API',
        version: process.env.APP_VERSION || '1.0.0',
        description: 'API para la plataforma de planificación de viajes',
        documentation: 'https://docs.voyaj.com',
        endpoints: {
          users: '/api/users',
          health: '/health'
        }
      }, 'Información de la API');
    });

    // Rutas de usuarios
    this.app.use('/api/users', userRoutes);

    // Ruta 404
    this.app.use('*', (req, res) => {
      ResponseUtils.notFound(res, `Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    });
  }

  private initializeErrorHandling(): void {
    // Manejo global de errores
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      const errorResponse = ErrorHandler.handleError(error);
      
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    });

    // Manejar promesas rechazadas no capturadas
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.logger.error('Unhandled Promise Rejection:', { reason, promise });
    });

    // Manejar excepciones no capturadas
    process.on('uncaughtException', (error: Error) => {
      this.logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    this.logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    try {
      // Cerrar conexión a la base de datos
      const dbConnection = DatabaseConnection.getInstance();
      await dbConnection.gracefulShutdown();
      
      this.logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      // Conectar a la base de datos
      this.logger.info('Conectando a la base de datos...');
      const dbConnection = DatabaseConnection.getInstance();
      await dbConnection.connect();
      
      // Iniciar servidor
      this.app.listen(this.port, () => {
        this.logger.info(`🚀 Servidor iniciado en puerto ${this.port}`);
        this.logger.info(`📡 Entorno: ${process.env.NODE_ENV}`);
        this.logger.info(`🔗 URL: http://localhost:${this.port}`);
        this.logger.info(`📚 API Info: http://localhost:${this.port}/api`);
        this.logger.info(`💚 Health Check: http://localhost:${this.port}/health`);
      });
    } catch (error) {
      this.logger.error('Error iniciando el servidor:', error);
      process.exit(1);
    }
  }
}

// Iniciar servidor
const server = new Server();
server.start().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});