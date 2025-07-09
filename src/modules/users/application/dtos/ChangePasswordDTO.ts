// DTO para cambio de contraseña
export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

// DTO para validación de entrada
export interface ChangePasswordRequestDTO {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}