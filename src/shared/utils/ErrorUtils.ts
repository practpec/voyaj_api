import { ERROR_CODES } from '../constants';
import { LoggerService } from '../services/LoggerService';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR, true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, errorCode: string = ERROR_CODES.INVALID_CREDENTIALS) {
    super(message, 401, errorCode, true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string) {
    super(message, 403, 'FORBIDDEN', true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, errorCode: string = 'NOT_FOUND') {
    super(message, 404, errorCode, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, errorCode: string = 'CONFLICT') {
    super(message, 409, errorCode, true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Demasiadas peticiones') {
    super(message, 429, ERROR_CODES.RATE_LIMIT_EXCEEDED, true);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, ERROR_CODES.DATABASE_ERROR, false, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Error interno del servidor', details?: any) {
    super(message, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, false, details);
  }
}

export class ErrorHandler {
  private static logger = LoggerService.getInstance();

  public static handleError(error: Error | AppError): {
    message: string;
    statusCode: number;
    errorCode: string;
    timestamp: Date;
    details?: any;
  } {
    let statusCode = 500;
    let errorCode: string = ERROR_CODES.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let details: any = undefined;

    if (error instanceof AppError) {
      statusCode = error.statusCode;
      errorCode = error.errorCode;
      message = error.message;
      details = error.details;
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      errorCode = ERROR_CODES.VALIDATION_ERROR;
      message = error.message;
    } else if (error.name === 'MongoError') {
      statusCode = 500;
      errorCode = ERROR_CODES.DATABASE_ERROR;
      message = 'Error en la base de datos';
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      errorCode = ERROR_CODES.TOKEN_INVALID;
      message = 'Token inválido';
    } else if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      errorCode = ERROR_CODES.TOKEN_EXPIRED;
      message = 'Token expirado';
    }

    // Log del error
    if (statusCode >= 500) {
      this.logger.error(`Error ${errorCode}: ${message}`, {
        stack: error.stack,
        details
      });
    } else {
      this.logger.warn(`Error ${errorCode}: ${message}`, { details });
    }

    return {
      message,
      statusCode,
      errorCode,
      timestamp: new Date(),
      details: process.env.NODE_ENV === 'development' ? details : undefined
    };
  }

  public static createUserNotFoundError(): NotFoundError {
    return new NotFoundError('Usuario no encontrado', ERROR_CODES.USER_NOT_FOUND);
  }

  public static createUserExistsError(): ConflictError {
    return new ConflictError('El usuario ya existe', ERROR_CODES.USER_ALREADY_EXISTS);
  }

  public static createInvalidCredentialsError(): AuthenticationError {
    return new AuthenticationError('Credenciales inválidas', ERROR_CODES.INVALID_CREDENTIALS);
  }

  public static createAccountLockedError(): AuthenticationError {
    return new AuthenticationError('Cuenta bloqueada por demasiados intentos', ERROR_CODES.ACCOUNT_LOCKED);
  }

  public static createEmailNotVerifiedError(): AuthenticationError {
    return new AuthenticationError('Email no verificado', ERROR_CODES.EMAIL_NOT_VERIFIED);
  }

  public static createUserDeletedError(): AuthenticationError {
    return new AuthenticationError('Usuario eliminado', ERROR_CODES.USER_DELETED);
  }

  public static createValidationError(message: string, details?: any): ValidationError {
    return new ValidationError(message, details);
  }

  public static createTokenExpiredError(): AuthenticationError {
    return new AuthenticationError('Token expirado', ERROR_CODES.TOKEN_EXPIRED);
  }

  public static createTokenInvalidError(): AuthenticationError {
    return new AuthenticationError('Token inválido', ERROR_CODES.TOKEN_INVALID);
  }

  public static createWeakPasswordError(): ValidationError {
    return new ValidationError('La contraseña no cumple con los requisitos mínimos', {
      requirements: [
        'Mínimo 8 caracteres',
        'Al menos una mayúscula',
        'Al menos una minúscula',
        'Al menos un número',
        'Al menos un caracter especial'
      ]
    });
  }

  public static createInvalidEmailError(): ValidationError {
    return new ValidationError('Formato de email inválido', ERROR_CODES.INVALID_EMAIL);
  }

  public static createDatabaseError(message: string, details?: any): DatabaseError {
    return new DatabaseError(message, details);
  }

  public static createRateLimitError(message?: string): RateLimitError {
    return new RateLimitError(message);
  }
}