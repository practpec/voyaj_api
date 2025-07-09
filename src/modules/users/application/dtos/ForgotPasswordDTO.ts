// DTO para solicitud de recuperación de contraseña
export interface ForgotPasswordDTO {
  correo_electronico: string;
}

// DTO para respuesta de recuperación de contraseña
export interface ForgotPasswordResponseDTO {
  message: string;
  codeSent: boolean;
  expiresIn: number; // tiempo en minutos
}