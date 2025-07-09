// DTO para actualización de perfil
export interface UpdateProfileDTO {
  nombre?: string;
  url_foto_perfil?: string;
}

// DTO extendido para actualización completa de perfil
export interface UpdateProfileExtendedDTO {
  nombre?: string;
  url_foto_perfil?: string;
  telefono?: string;
  fecha_nacimiento?: Date;
  genero?: string;
  pais?: string;
  ciudad?: string;
  biografia?: string;
  configuracion_privacidad?: {
    perfil_publico?: boolean;
    mostrar_email?: boolean;
    permitir_mensajes?: boolean;
  };
}