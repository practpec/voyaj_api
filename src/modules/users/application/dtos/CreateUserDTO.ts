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
  telefono?: string;
  pais?: string;
  ciudad?: string;
  fecha_nacimiento?: Date;
  biografia?: string;
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

// DTO para actualización de preferencias
export interface UpdatePreferencesDTO {
  language?: 'es' | 'en' | 'fr' | 'pt';
  currency?: 'USD' | 'EUR' | 'MXN' | 'GBP' | 'CAD';
  notifications?: {
    email?: boolean;
    push?: boolean;
    marketing?: boolean;
    tripUpdates?: boolean;
    friendRequests?: boolean;
  };
  privacy?: {
    profilePublic?: boolean;
    showEmail?: boolean;
    allowMessages?: boolean;
    showOnlineStatus?: boolean;
  };
  theme?: 'light' | 'dark' | 'auto';
  timezone?: string;
}

// DTO para subida de avatar
export interface UploadAvatarDTO {
  userId: string;
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
  telefono?: string;
  pais?: string;
  ciudad?: string;
  fecha_nacimiento?: Date;
  biografia?: string;
  preferencias: {
    language: string;
    currency: string;
    notifications: {
      email: boolean;
      push: boolean;
      marketing: boolean;
      tripUpdates: boolean;
      friendRequests: boolean;
    };
    privacy: {
      profilePublic: boolean;
      showEmail: boolean;
      allowMessages: boolean;
      showOnlineStatus: boolean;
    };
    theme: string;
    timezone: string;
  };
  plan: string;
  esta_activo: boolean;
  fullName: string;
  firstName: string;
  lastName: string;
  age?: number;
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

// DTO de respuesta para avatar subido
export interface AvatarUploadResponseDTO {
  url: string;
  message: string;
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
      ultimo_acceso: user.ultimo_acceso || user.lastAccess,
      telefono: user.telefono || user.phone,
      pais: user.pais || user.country,
      ciudad: user.ciudad || user.city,
      fecha_nacimiento: user.fecha_nacimiento || user.birthDate,
      biografia: user.biografia || user.bio,
      preferencias: user.preferencias || user.preferences,
      plan: user.plan,
      esta_activo: user.esta_activo || user.isActive,
      fullName: user.fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      age: user.age
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

  public static toAvatarResponse(url: string): AvatarUploadResponseDTO {
    return {
      url,
      message: 'Avatar actualizado exitosamente'
    };
  }
}