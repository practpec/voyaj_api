// DTO para verificación de email
export interface VerifyEmailDTO {
  correo_electronico: string;
  code: string;
}

// DTO para respuesta de verificación
export interface VerifyEmailResponseDTO {
  success: boolean;
  message: string;
  emailVerified: boolean;
  userId: string;
}