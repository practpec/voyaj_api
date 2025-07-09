// DTO para registro de usuario
export interface CreateUserDTO {
  correo_electronico: string;
  password: string;
  nombre?: string;
}

// DTO para login de usuario
export interface LoginUserDTO {
  correo_electronico: string;
  password: string;
}

// DTO para actualización de perfil
export interface UpdateProfileDTO {
  nombre?: string;
  url_foto_perfil?: string;
}

// DTO para cambio de contraseña
export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

// DTO para recuperación de contraseña
export interface ForgotPasswordDTO {
  correo_electronico: string;
}

// DTO para reseteo de contraseña
export interface ResetPasswordDTO {
  correo_electronico: string;
  code: string;
  newPassword: string;
}

// DTO para verificación de email
export interface VerifyEmailDTO {
  correo_electronico: string;
  code: string;
}

// DTO para reenvío de verificación
export interface ResendVerificationDTO {
  correo_electronico: string;
}

// DTO para búsqueda de usuarios
export interface SearchUsersDTO {
  query: string;
  page?: number;
  limit?: number;
}

// DTO para refresh token
export interface RefreshTokenDTO {
  refreshToken: string;
}

// DTO de respuesta para usuario autenticado
export interface AuthenticatedUserDTO {
  id: string;
  correo_electronico: string;
  nombre?: string;
  url_foto_perfil?: string;
  email_verificado: boolean;
  creado_en: Date;
  ultimo_acceso?: Date;
}

// DTO de respuesta para login/registro exitoso
export interface AuthResponseDTO {
  user: AuthenticatedUserDTO;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

// DTO de respuesta para tokens renovados
export interface TokenResponseDTO {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

// DTO de respuesta para perfil público
export interface PublicUserDTO {
  id: string;
  correo_electronico: string;
  nombre?: string;
  url_foto_perfil?: string;
  creado_en: Date;
}

// DTO de respuesta para búsqueda de usuarios
export interface UserSearchResultDTO {
  id: string;
  correo_electronico: string;
  nombre?: string;
  url_foto_perfil?: string;
}

// DTO para estadísticas de usuarios (admin)
export interface UserStatsDTO {
  total: number;
  active: number;
  deleted: number;
  verified: number;
  blocked: number;
}

// DTO para información de health check
export interface HealthCheckDTO {
  status: 'ok' | 'error';
  timestamp: Date;
  uptime: number;
  database: {
    connected: boolean;
    ping: number;
  };
  cache: {
    size: number;
    memoryUsage: string;
  };
  version: string;
}

// DTO para información de la API
export interface ApiInfoDTO {
  name: string;
  version: string;
  description: string;
  endpoints: {
    auth: string[];
    users: string[];
  };
  documentation: string;
}

// Helpers para transformación de datos
export class UserDTOMapper {
  public static toAuthenticatedUser(user: any): AuthenticatedUserDTO {
    return {
      id: user.id,
      correo_electronico: user.correo_electronico || user.email,
      nombre: user.nombre || user.name,
      url_foto_perfil: user.url_foto_perfil || user.profilePictureUrl,
      email_verificado: user.email_verificado || user.isEmailVerified,
      creado_en: user.creado_en || user.createdAt,
      ultimo_acceso: user.ultimo_acceso || user.lastAccess
    };
  }

  public static toPublicUser(user: any): PublicUserDTO {
    return {
      id: user.id,
      correo_electronico: user.correo_electronico || user.email,
      nombre: user.nombre || user.name,
      url_foto_perfil: user.url_foto_perfil || user.profilePictureUrl,
      creado_en: user.creado_en || user.createdAt
    };
  }

  public static toSearchResult(user: any): UserSearchResultDTO {
    return {
      id: user.id,
      correo_electronico: user.correo_electronico || user.email,
      nombre: user.nombre || user.name,
      url_foto_perfil: user.url_foto_perfil || user.profilePictureUrl
    };
  }

  public static toAuthResponse(
    user: any,
    tokens: { accessToken: string; refreshToken: string }
  ): AuthResponseDTO {
    return {
      user: this.toAuthenticatedUser(user),
      tokens
    };
  }
}