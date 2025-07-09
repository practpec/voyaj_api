import Joi from 'joi';
import { APP_LIMITS, VALIDATION_PATTERNS } from '../constants';

export class ValidationUtils {
  // Esquemas básicos reutilizables
  private static readonly basicSchemas = {
    email: Joi.string()
      .email()
      .pattern(VALIDATION_PATTERNS.EMAIL)
      .required()
      .messages({
        'string.email': 'El email debe tener un formato válido',
        'any.required': 'El email es requerido'
      }),

    password: Joi.string()
      .min(APP_LIMITS.PASSWORD_MIN_LENGTH)
      .max(APP_LIMITS.PASSWORD_MAX_LENGTH)
      .pattern(VALIDATION_PATTERNS.PASSWORD)
      .required()
      .messages({
        'string.min': `La contraseña debe tener al menos ${APP_LIMITS.PASSWORD_MIN_LENGTH} caracteres`,
        'string.max': `La contraseña no puede tener más de ${APP_LIMITS.PASSWORD_MAX_LENGTH} caracteres`,
        'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un caracter especial',
        'any.required': 'La contraseña es requerida'
      }),

    name: Joi.string()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede tener más de 100 caracteres',
        'string.pattern.base': 'El nombre solo puede contener letras y espacios'
      }),

    uuid: Joi.string()
      .pattern(VALIDATION_PATTERNS.UUID)
      .messages({
        'string.pattern.base': 'El ID debe ser un UUID válido'
      }),

    verificationCode: Joi.string()
      .length(APP_LIMITS.EMAIL_VERIFICATION_CODE_LENGTH)
      .pattern(/^\d+$/)
      .required()
      .messages({
        'string.length': `El código debe tener ${APP_LIMITS.EMAIL_VERIFICATION_CODE_LENGTH} dígitos`,
        'string.pattern.base': 'El código solo puede contener números',
        'any.required': 'El código de verificación es requerido'
      }),

    resetCode: Joi.string()
      .length(APP_LIMITS.PASSWORD_RESET_CODE_LENGTH)
      .pattern(/^\d+$/)
      .required()
      .messages({
        'string.length': `El código debe tener ${APP_LIMITS.PASSWORD_RESET_CODE_LENGTH} dígitos`,
        'string.pattern.base': 'El código solo puede contener números',
        'any.required': 'El código de recuperación es requerido'
      })
  };

  // Validación de registro de usuario
  public static readonly registerUserSchema = Joi.object({
    correo_electronico: this.basicSchemas.email,
    password: this.basicSchemas.password,
    nombre: this.basicSchemas.name.optional()
  });

  // Validación de inicio de sesión
  public static readonly loginSchema = Joi.object({
    correo_electronico: this.basicSchemas.email,
    password: Joi.string().required().messages({
      'any.required': 'La contraseña es requerida'
    })
  });

  // Validación de actualización de perfil
  public static readonly updateProfileSchema = Joi.object({
    nombre: this.basicSchemas.name.optional(),
    url_foto_perfil: Joi.string().uri().optional().messages({
      'string.uri': 'La URL de la foto debe ser válida'
    })
  });

  // Validación de cambio de contraseña
  public static readonly changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'La contraseña actual es requerida'
    }),
    newPassword: this.basicSchemas.password
  });

  // Validación de solicitud de recuperación de contraseña
  public static readonly forgotPasswordSchema = Joi.object({
    correo_electronico: this.basicSchemas.email
  });

  // Validación de reseteo de contraseña
  public static readonly resetPasswordSchema = Joi.object({
    correo_electronico: this.basicSchemas.email,
    code: this.basicSchemas.resetCode,
    newPassword: this.basicSchemas.password
  });

  // Validación de verificación de email
  public static readonly verifyEmailSchema = Joi.object({
    correo_electronico: this.basicSchemas.email,
    code: this.basicSchemas.verificationCode
  });

  // Validación de reenvío de verificación
  public static readonly resendVerificationSchema = Joi.object({
    correo_electronico: this.basicSchemas.email
  });

  // Validación de refresh token
  public static readonly refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'El refresh token es requerido'
    })
  });

  // Validación de búsqueda de usuarios
  public static readonly searchUsersSchema = Joi.object({
    query: Joi.string()
      .min(APP_LIMITS.SEARCH_MIN_LENGTH)
      .required()
      .messages({
        'string.min': `La búsqueda debe tener al menos ${APP_LIMITS.SEARCH_MIN_LENGTH} caracteres`,
        'any.required': 'El término de búsqueda es requerido'
      }),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(APP_LIMITS.PAGINATION_MAX_LIMIT)
      .default(APP_LIMITS.PAGINATION_DEFAULT_LIMIT)
  });

  // Validación de parámetros de paginación
  public static readonly paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(APP_LIMITS.PAGINATION_MAX_LIMIT)
      .default(APP_LIMITS.PAGINATION_DEFAULT_LIMIT)
  });

  // Validación de ID de usuario
  public static readonly userIdSchema = Joi.object({
    id: this.basicSchemas.uuid.required()
  });

  // Método para validar datos
  public static validate<T>(schema: Joi.ObjectSchema, data: any): {
    isValid: boolean;
    value?: T;
    error?: string;
    details?: any;
  } {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      return {
        isValid: false,
        error: error.details[0].message,
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      };
    }

    return {
      isValid: true,
      value: value as T
    };
  }

  // Método para validar email específicamente
  public static validateEmail(email: string): boolean {
    return VALIDATION_PATTERNS.EMAIL.test(email);
  }

  // Método para validar fortaleza de contraseña
  public static validatePasswordStrength(password: string): {
    isValid: boolean;
    strength: 'weak' | 'medium' | 'strong';
    issues: string[];
  } {
    const issues: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'weak';

    if (password.length < APP_LIMITS.PASSWORD_MIN_LENGTH) {
      issues.push(`Debe tener al menos ${APP_LIMITS.PASSWORD_MIN_LENGTH} caracteres`);
    }

    if (!/[a-z]/.test(password)) {
      issues.push('Debe contener al menos una letra minúscula');
    }

    if (!/[A-Z]/.test(password)) {
      issues.push('Debe contener al menos una letra mayúscula');
    }

    if (!/\d/.test(password)) {
      issues.push('Debe contener al menos un número');
    }

    if (!/[@$!%*?&]/.test(password)) {
      issues.push('Debe contener al menos un caracter especial (@$!%*?&)');
    }

    const isValid = issues.length === 0;

    if (isValid) {
      if (password.length >= 12 && /[A-Z].*[A-Z]/.test(password) && /\d.*\d/.test(password)) {
        strength = 'strong';
      } else if (password.length >= 10) {
        strength = 'medium';
      }
    }

    return { isValid, strength, issues };
  }

  // Método para validar UUID
  public static validateUUID(uuid: string): boolean {
    return VALIDATION_PATTERNS.UUID.test(uuid);
  }

  // Método para sanitizar input de búsqueda
  public static sanitizeSearchQuery(query: string): string {
    return query
      .trim()
      .replace(/[<>]/g, '') // Remover caracteres peligrosos
      .replace(/\s+/g, ' ') // Normalizar espacios
      .substring(0, 100); // Limitar longitud
  }

  // Método para validar y sanitizar nombre
  public static sanitizeName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Normalizar espacios
      .replace(/[^\w\sÀ-ÿ]/g, '') // Solo letras, números, espacios y acentos
      .substring(0, 100); // Limitar longitud
  }
}