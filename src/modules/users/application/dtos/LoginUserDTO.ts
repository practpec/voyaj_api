// DTO para login de usuario
export interface LoginUserDTO {
  correo_electronico: string;
  password: string;
  rememberMe?: boolean;
}

// DTO para contexto de login adicional
export interface LoginContextDTO {
  ip?: string;
  userAgent?: string;
  deviceId?: string;
  location?: {
    country?: string;
    city?: string;
  };
}