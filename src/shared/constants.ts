// src/shared/constants.ts
export const RATE_LIMITS = {
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // máximo 100 requests por ventana
  },
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5 // máximo 5 intentos de login por ventana
  },
  REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3 // máximo 3 registros por hora
  },
  FORGOT_PASSWORD: {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3 // máximo 3 solicitudes de recovery por hora
  }
};

export const ERROR_CODES = {
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_MISSING: 'TOKEN_MISSING',
  
  // User errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  USER_DELETED: 'USER_DELETED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_EMAIL: 'INVALID_EMAIL',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  
  // General errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND'
};