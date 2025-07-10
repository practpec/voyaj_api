// src/shared/database/Connection.ts
import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { LoggerService } from '../services/LoggerService';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private logger: LoggerService;

  private constructor() {
    this.logger = LoggerService.getInstance();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      const dbName = process.env.MONGODB_DB_NAME || 'voyaj';

      this.logger.info(`Intentando conectar a: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);

      const options: MongoClientOptions = {
        // Configuración de pool de conexiones
        maxPoolSize: 10,
        minPoolSize: 2,
        
        // Timeouts para MongoDB Atlas
        serverSelectionTimeoutMS: 30000, // 30 segundos
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        
        // Configuración de red
        family: 4, // IPv4
        retryWrites: true,
        retryReads: true,
        
        // Para MongoDB Atlas
        tls: true,
        
        // Configuración adicional
        heartbeatFrequencyMS: 10000,
        maxIdleTimeMS: 30000,
        
        // Configuración de replica set
        readPreference: 'primaryPreferred'
      };

      this.client = new MongoClient(uri, options);
      
      // Conectar con timeout personalizado
      await Promise.race([
        this.client.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de conexión')), 30000)
        )
      ]);

      this.db = this.client.db(dbName);
      
      // Verificar conexión con ping
      await this.db.admin().ping();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;

      this.logger.info('✅ Conexión a MongoDB establecida exitosamente');
      this.setupEventHandlers();

    } catch (error) {
      this.logger.error('❌ Error al conectar con MongoDB:', error);
      
      // Si es un error de autenticación o configuración, no reintentar
      if (error instanceof Error) {
        if (error.message.includes('Authentication failed') || 
            error.message.includes('bad auth') ||
            error.message.includes('Timeout de conexión')) {
          this.logger.error('Error crítico de conexión. Verifique las credenciales y configuración.');
          throw error;
        }
      }
      
      await this.handleReconnection();
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('serverDescriptionChanged', (event) => {
      this.logger.debug(`Estado del servidor MongoDB: ${event.newDescription.type}`);
    });

    this.client.on('topologyOpening', () => {
      this.logger.info('🔄 Abriendo topología de MongoDB');
    });

    this.client.on('topologyClosed', () => {
      this.logger.warn('⚠️  Topología de MongoDB cerrada');
      this.isConnected = false;
    });

    this.client.on('error', (error) => {
      this.logger.error('❌ Error en cliente MongoDB:', error);
      this.handleReconnection();
    });

    this.client.on('serverHeartbeatFailed', (event) => {
      this.logger.warn(`💔 Heartbeat fallido para ${event.connectionId}`);
    });
  }

  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('❌ Máximo número de intentos de reconexión alcanzado');
      throw new Error('No se pudo conectar a MongoDB después de múltiples intentos');
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    this.logger.info(`🔄 Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts} en ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    await this.connect();
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.isConnected = false;
      this.logger.info('👋 Desconexión de MongoDB completada');
    }
  }

  public getDatabase(): Db {
    if (!this.db || !this.isConnected) {
      throw new Error('Base de datos no conectada');
    }
    return this.db;
  }

  public getClient(): MongoClient {
    if (!this.client || !this.isConnected) {
      throw new Error('Cliente MongoDB no conectado');
    }
    return this.client;
  }

  public isConnectionActive(): boolean {
    return this.isConnected;
  }

  public async healthCheck(): Promise<{
    connected: boolean;
    ping: number;
    dbStats?: any;
  }> {
    if (!this.isConnected || !this.db) {
      return { connected: false, ping: -1 };
    }

    try {
      const startTime = Date.now();
      await this.db.admin().ping();
      const ping = Date.now() - startTime;

      const dbStats = await this.db.stats();
      
      return {
        connected: true,
        ping,
        dbStats: {
          collections: dbStats.collections,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes
        }
      };
    } catch (error) {
      this.logger.error('❌ Error en health check de MongoDB:', error);
      return { connected: false, ping: -1 };
    }
  }

  public async gracefulShutdown(): Promise<void> {
    this.logger.info('🛑 Iniciando apagado graceful de MongoDB...');
    
    try {
      if (this.client) {
        await this.client.close(true);
      }
      this.isConnected = false;
      this.logger.info('✅ Apagado graceful de MongoDB completado');
    } catch (error) {
      this.logger.error('❌ Error durante apagado graceful:', error);
    }
  }

  // Método para verificar la URI de conexión
  public validateConnectionString(): boolean {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      this.logger.error('❌ MONGODB_URI no está definida en las variables de entorno');
      return false;
    }

    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      this.logger.error('❌ MONGODB_URI tiene un formato inválido');
      return false;
    }

    // Para MongoDB Atlas, verificar que tenga el formato correcto
    if (uri.includes('mongodb.net')) {
      if (!uri.includes('@')) {
        this.logger.error('❌ MONGODB_URI de Atlas debe incluir credenciales');
        return false;
      }
    }

    return true;
  }
}