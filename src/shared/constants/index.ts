// src/shared/constants/index.ts

// Estados de usuario
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING_VERIFICATION: 'pending_verification',
  BLOCKED: 'blocked'
} as const;

// Roles de usuario
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user'
} as const;

// Roles de miembro de viaje
export const TRIP_MEMBER_ROLES = {
  OWNER: 'owner',
  EDITOR: 'editor',
  VIEWER: 'viewer'
} as const;

// Estados de invitación
export const INVITATION_STATUS = {
  PENDING: 'pendiente',
  ACCEPTED: 'aceptada',
  REJECTED: 'rechazada',
  CANCELLED: 'cancelada',
  EXPIRED: 'expirada'
} as const;

// Estados de amistad
export const FRIENDSHIP_STATUS = {
  PENDING: 'pendiente',
  ACCEPTED: 'aceptada',
  REJECTED: 'rechazada'
} as const;

// Tipos de gastos
export const EXPENSE_CATEGORIES = {
  TRANSPORT: 'transport',
  ACCOMMODATION: 'accommodation',
  FOOD: 'food',
  ENTERTAINMENT: 'entertainment',
  SHOPPING: 'shopping',
  HEALTH: 'health',
  OTHER: 'other'
} as const;

// Monedas soportadas
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'MXN', 'CAD', 'AUD', 'JPY', 'CNY', 'BRL', 'ARS'
] as const;

// Códigos de error
export const ERROR_CODES = {
  // Autenticación
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_MISSING: 'TOKEN_MISSING',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  
  // Usuario
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_DELETED: 'USER_DELETED',
  
  // Validación
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_EMAIL: 'INVALID_EMAIL',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  
  // Sistema
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND'
} as const;

// Límites de la aplicación
export const APP_LIMITS = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCK_DURATION: 15 * 60 * 1000, // 15 minutos
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  EMAIL_VERIFICATION_CODE_LENGTH: 6,
  EMAIL_VERIFICATION_EXPIRY: 24 * 60 * 60 * 1000, // 24 horas
  PASSWORD_RESET_CODE_LENGTH: 6,
  PASSWORD_RESET_EXPIRY: 10 * 60 * 1000, // 10 minutos
  SEARCH_MIN_LENGTH: 2,
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  PAGINATION_DEFAULT_LIMIT: 20,
  PAGINATION_MAX_LIMIT: 100
} as const;

// Configuraciones JWT
export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  ALGORITHM: 'HS256'
} as const;

// Rate limiting
export const RATE_LIMITS = {
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5
  },
  REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3
  },
  FORGOT_PASSWORD: {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3
  },
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100
  }
} as const;

// Patrones de validación
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
} as const;

// Tipos de eventos
export const EVENT_TYPES = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGGED_IN: 'user.logged_in',
  USER_LOGGED_OUT: 'user.logged_out',
  EMAIL_VERIFIED: 'email.verified',
  PASSWORD_CHANGED: 'password.changed',
  ACCOUNT_LOCKED: 'account.locked'
} as const;

// Tipos de archivo permitidos
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
} as const;

// Configuraciones de imagen
export const IMAGE_CONFIG = {
  PROFILE_PICTURE: {
    width: 400,
    height: 400,
    quality: 85,
    format: 'webp'
  },
  TRIP_PHOTO: {
    width: 1200,
    height: 800,
    quality: 85,
    format: 'webp'
  },
  THUMBNAIL: {
    width: 200,
    height: 200,
    quality: 75,
    format: 'webp'
  }
} as const;