import jwt, { SignOptions } from 'jsonwebtoken';
import { JWT_CONFIG } from '../constants';
import { ErrorHandler } from '../utils/ErrorUtils';

export interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class TokenService {
  private static instance: TokenService;
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;

  private constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'default-access-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';

    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.warn('⚠️  JWT secrets no configurados en variables de entorno');
    }
  }

  public static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  // Generar par de tokens (access + refresh)
  public generateTokenPair(payload: Omit<TokenPayload, 'iat' | 'exp'>): TokenPair {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return { accessToken, refreshToken };
  }

  // Generar access token
  public generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    const options: SignOptions = {
      expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
      algorithm: JWT_CONFIG.ALGORITHM as jwt.Algorithm,
      issuer: 'voyaj-api',
      audience: 'voyaj-app'
    };
    
    return jwt.sign(payload, this.accessTokenSecret, options);
  }

  // Generar refresh token
  public generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    const refreshPayload = { userId: payload.userId }; // Solo incluir userId por seguridad
    const options: SignOptions = {
      expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY,
      algorithm: JWT_CONFIG.ALGORITHM as jwt.Algorithm,
      issuer: 'voyaj-api',
      audience: 'voyaj-app'
    };
    
    return jwt.sign(refreshPayload, this.refreshTokenSecret, options);
  }

  // Verificar access token
  public verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        algorithms: [JWT_CONFIG.ALGORITHM as jwt.Algorithm],
        issuer: 'voyaj-api',
        audience: 'voyaj-app'
      }) as TokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ErrorHandler.createTokenExpiredError();
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw ErrorHandler.createTokenInvalidError();
      }
      throw ErrorHandler.createTokenInvalidError();
    }
  }

  // Verificar refresh token
  public verifyRefreshToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: [JWT_CONFIG.ALGORITHM as jwt.Algorithm],
        issuer: 'voyaj-api',
        audience: 'voyaj-app'
      }) as { userId: string };

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ErrorHandler.createTokenExpiredError();
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw ErrorHandler.createTokenInvalidError();
      }
      throw ErrorHandler.createTokenInvalidError();
    }
  }

  // Decodificar token sin verificar (útil para extraer información cuando está expirado)
  public decodeToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.decode(token) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  // Verificar si un token está expirado
  public isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return true;

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  // Obtener tiempo restante del token en segundos
  public getTokenRemainingTime(token: string): number {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return 0;

      const currentTime = Math.floor(Date.now() / 1000);
      const remainingTime = decoded.exp - currentTime;
      return Math.max(0, remainingTime);
    } catch (error) {
      return 0;
    }
  }

  // Extraer información del usuario desde el token
  public extractUserInfo(token: string): {
    userId: string;
    email: string;
    role?: string;
  } | null {
    try {
      const decoded = this.verifyAccessToken(token);
      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      return null;
    }
  }

  // Generar token temporal para verificación de email
  public generateEmailVerificationToken(email: string, code: string): string {
    const payload = { email, code, type: 'email_verification' };
    const options: SignOptions = {
      expiresIn: '24h',
      algorithm: JWT_CONFIG.ALGORITHM as jwt.Algorithm,
      issuer: 'voyaj-api'
    };
    
    return jwt.sign(payload, this.accessTokenSecret, options);
  }

  // Generar token temporal para reset de contraseña
  public generatePasswordResetToken(email: string, code: string): string {
    const payload = { email, code, type: 'password_reset' };
    const options: SignOptions = {
      expiresIn: '10m',
      algorithm: JWT_CONFIG.ALGORITHM as jwt.Algorithm,
      issuer: 'voyaj-api'
    };
    
    return jwt.sign(payload, this.accessTokenSecret, options);
  }

  // Verificar token de verificación de email
  public verifyEmailVerificationToken(token: string): { email: string; code: string } {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as {
        email: string;
        code: string;
        type: string;
      };

      if (decoded.type !== 'email_verification') {
        throw ErrorHandler.createTokenInvalidError();
      }

      return { email: decoded.email, code: decoded.code };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ErrorHandler.createTokenExpiredError();
      }
      throw ErrorHandler.createTokenInvalidError();
    }
  }

  // Verificar token de reset de contraseña
  public verifyPasswordResetToken(token: string): { email: string; code: string } {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as {
        email: string;
        code: string;
        type: string;
      };

      if (decoded.type !== 'password_reset') {
        throw ErrorHandler.createTokenInvalidError();
      }

      return { email: decoded.email, code: decoded.code };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ErrorHandler.createTokenExpiredError();
      }
      throw ErrorHandler.createTokenInvalidError();
    }
  }

  // Renovar tokens cuando el access token está próximo a expirar
  public refreshTokenPair(refreshToken: string, userPayload: Omit<TokenPayload, 'iat' | 'exp'>): TokenPair {
    // Verificar que el refresh token sea válido
    this.verifyRefreshToken(refreshToken);
    
    // Generar nuevo par de tokens
    return this.generateTokenPair(userPayload);
  }

  // Validar formato de token Bearer
  public extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7); // Remover "Bearer " del inicio
  }

  // Generar JWT para firma de URLs (útil para uploads)
  public generateSignedUrlToken(payload: any, expiresIn: string | number = '1h'): string {
    const options: SignOptions = {
      expiresIn: expiresIn as any,
      algorithm: JWT_CONFIG.ALGORITHM as jwt.Algorithm,
      issuer: 'voyaj-api'
    };
    
    return jwt.sign(payload, this.accessTokenSecret, options);
  }

  // Verificar token de URL firmada
  public verifySignedUrlToken(token: string): any {
    try {
      return jwt.verify(token, this.accessTokenSecret, {
        algorithms: [JWT_CONFIG.ALGORITHM as jwt.Algorithm],
        issuer: 'voyaj-api'
      });
    } catch (error) {
      throw ErrorHandler.createTokenInvalidError();
    }
  }
}