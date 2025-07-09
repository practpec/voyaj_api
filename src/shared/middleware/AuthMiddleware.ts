import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/TokenService';
import { CacheService } from '../services/CacheService';
import { LoggerService } from '../services/LoggerService';
import { ErrorHandler } from '../utils/ErrorUtils';
import { ResponseUtils } from '../utils/ResponseUtils';

// Extender la interfaz Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role?: string;
      };
    }
  }
}

export class AuthMiddleware {
  private static tokenService = TokenService.getInstance();
  private static cacheService = CacheService.getInstance();
  private static logger = LoggerService.getInstance();

  // Middleware principal de autenticación (token requerido)
  public static authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        this.logger.logSecurity('Missing auth token', req.ip, req.get('User-Agent'));
        ResponseUtils.unauthorized(res, 'Token de autenticación requerido');
        return;
      }

      const userInfo = await this.validateAndGetUser(token, req);
      req.user = userInfo;
      
      this.logger.logAuth('Token validated', userInfo.userId, userInfo.email, true);
      next();
    } catch (error) {
      this.handleAuthError(error, req, res);
    }
  };

  // Middleware de autenticación opcional (token no requerido)
  public static optionalAuthenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const token = this.extractToken(req);
      
      if (token) {
        try {
          const userInfo = await this.validateAndGetUser(token, req);
          req.user = userInfo;
          this.logger.logAuth('Optional token validated', userInfo.userId, userInfo.email, true);
        } catch (error) {
          // En autenticación opcional, ignoramos errores de token
          this.logger.debug('Optional auth failed, continuing without user', error);
        }
      }
      
      next();
    } catch (error) {
      // En caso de error inesperado, continuar sin autenticación
      this.logger.warn('Unexpected error in optional auth:', error);
      next();
    }
  };

  // Middleware para verificar roles específicos
  public static requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        ResponseUtils.unauthorized(res, 'Autenticación requerida');
        return;
      }

      const userRole = req.user.role || 'user';
      
      if (!allowedRoles.includes(userRole)) {
        this.logger.logSecurity(
          `Insufficient role: ${userRole}`,
          req.ip,
          req.get('User-Agent'),
          req.user.userId
        );
        ResponseUtils.forbidden(res, 'Permisos insuficientes');
        return;
      }

      next();
    };
  };

  // Middleware para administradores únicamente
  public static requireAdmin = this.requireRole(['admin']);

  // Middleware para verificar propiedad de recurso
  public static requireOwnership = (userIdParam: string = 'id') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        ResponseUtils.unauthorized(res, 'Autenticación requerida');
        return;
      }

      const requestedUserId = req.params[userIdParam];
      const currentUserId = req.user.userId;
      const isAdmin = req.user.role === 'admin';

      if (!isAdmin && requestedUserId !== currentUserId) {
        this.logger.logSecurity(
          `Unauthorized access attempt to user ${requestedUserId}`,
          req.ip,
          req.get('User-Agent'),
          currentUserId
        );
        ResponseUtils.forbidden(res, 'Solo puedes acceder a tus propios recursos');
        return;
      }

      next();
    };
  };

  // Verificar si el usuario está activo y no eliminado
  public static checkUserStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      next();
      return;
    }

    try {
      // Verificar en cache si el usuario está activo
      const userStatus = this.cacheService.get(`user_status:${req.user.userId}`);
      
      if (userStatus === 'deleted' || userStatus === 'blocked') {
        this.logger.logSecurity(
          `Blocked user access attempt: ${userStatus}`,
          req.ip,
          req.get('User-Agent'),
          req.user.userId
        );
        ResponseUtils.unauthorized(res, 'Cuenta no disponible');
        return;
      }

      next();
    } catch (error) {
      this.logger.error('Error checking user status:', error);
      ResponseUtils.internalServerError(res);
    }
  };

  // Middleware para rate limiting por usuario
  public static rateLimitByUser = (maxRequests: number, windowMs: number) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        next();
        return;
      }

      const key = `${req.user.userId}:${req.route?.path || req.path}`;
      const requests = this.cacheService.incrementRateLimit(key, windowMs);

      if (requests > maxRequests) {
        this.logger.logSecurity(
          `Rate limit exceeded by user`,
          req.ip,
          req.get('User-Agent'),
          req.user.userId
        );
        ResponseUtils.rateLimitExceeded(res);
        return;
      }

      // Añadir headers de rate limit
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requests).toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

      next();
    };
  };

  // Extraer token del header Authorization
  private static extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    return this.tokenService.extractBearerToken(authHeader);
  }

  // Validar token y obtener información del usuario
  private static async validateAndGetUser(token: string, req: Request) {
    // Verificar si el token está en blacklist
    const isBlacklisted = this.cacheService.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw ErrorHandler.createTokenInvalidError();
    }

    // Verificar el token
    const tokenPayload = this.tokenService.verifyAccessToken(token);

    // Verificar si tenemos la información del usuario en cache
    let userInfo = this.cacheService.getUser(tokenPayload.userId);
    
    if (!userInfo) {
      // Si no está en cache, usar la información del token
      userInfo = {
        userId: tokenPayload.userId,
        email: tokenPayload.email,
        role: tokenPayload.role
      };
      
      // Cachear por 15 minutos
      this.cacheService.setUser(tokenPayload.userId, userInfo, 15 * 60 * 1000);
    }

    return userInfo;
  }

  // Manejar errores de autenticación
  private static handleAuthError(error: any, req: Request, res: Response): void {
    if (error.errorCode === 'TOKEN_EXPIRED') {
      this.logger.logAuth('Token expired', undefined, undefined, false);
      ResponseUtils.unauthorized(res, 'Token expirado');
    } else if (error.errorCode === 'TOKEN_INVALID') {
      this.logger.logAuth('Invalid token', undefined, undefined, false);
      this.logger.logSecurity('Invalid token attempt', req.ip, req.get('User-Agent'));
      ResponseUtils.unauthorized(res, 'Token inválido');
    } else {
      this.logger.error('Authentication error:', error);
      ResponseUtils.internalServerError(res);
    }
  }

  // Invalidar token (añadir a blacklist)
  public static invalidateToken = (token: string): void => {
    const remainingTime = this.tokenService.getTokenRemainingTime(token);
    if (remainingTime > 0) {
      this.cacheService.set(`blacklist:${token}`, true, remainingTime * 1000);
    }
  };

  // Middleware para verificar email verificado
  public static requireVerifiedEmail = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseUtils.unauthorized(res, 'Autenticación requerida');
      return;
    }

    // Verificar si el email está verificado (esto debería venir del token o cache)
    const emailVerified = this.cacheService.get(`email_verified:${req.user.userId}`);
    
    if (emailVerified === false) {
      ResponseUtils.forbidden(res, 'Email no verificado. Por favor verifica tu email antes de continuar.');
      return;
    }

    next();
  };

  // Middleware para logging de requests autenticados
  public static logAuthenticatedRequest = (req: Request, res: Response, next: NextFunction): void => {
    if (req.user) {
      this.logger.logRequest(
        req.method,
        req.originalUrl,
        res.statusCode,
        0, // duration se calculará en otro middleware
        req.user.userId
      );
    }
    next();
  };
}