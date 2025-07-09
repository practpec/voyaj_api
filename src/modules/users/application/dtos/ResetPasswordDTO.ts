// DTO para reseteo de contraseña
export interface ResetPasswordDTO {
  correo_electronico: string;
  code: string;
  newPassword: string;
}

// DTO para validación completa de reseteo
export interface ResetPasswordRequestDTO {
  correo_electronico: string;
  code: string;
  newPassword: string;
  confirmPassword?: string;
}