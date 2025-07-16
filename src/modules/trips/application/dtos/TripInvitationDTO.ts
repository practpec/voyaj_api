// src/modules/trips/application/dtos/TripInvitationDTO.ts

// DTOs de entrada para invitaciones
export interface SendTripInvitationDTO {
  email: string;
  role?: string;
  message?: string;
}

export interface BulkInviteMembersDTO {
  invitations: SendTripInvitationDTO[];
}

export interface ResendInvitationDTO {
  message?: string;
}

// DTOs de salida para invitaciones
export interface TripInvitationResponseDTO {
  id: string;
  tripId: string;
  tripTitle: string;
  tripDestination: string;
  tripStartDate: Date;
  tripEndDate: Date;
  invitedUserId: string;
  invitedUserEmail: string;
  inviterName: string;
  role: string;
  status: string;
  message?: string;
  sentAt: Date;
  expiresAt?: Date;
  responseAt?: Date;
  isExpired: boolean;
}

export interface PendingInvitationsResponseDTO {
  invitations: TripInvitationResponseDTO[];
  total: number;
  expiringSoon: number; // invitaciones que expiran en los próximos 7 días
}

export interface SentInvitationsResponseDTO {
  invitations: TripInvitationResponseDTO[];
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  expired: number;
}

// DTOs para exportación
export interface ExportTripDTO {
  format: 'pdf' | 'excel';
  includeMembers?: boolean;
  includeActivities?: boolean;
  includeExpenses?: boolean;
  includeDiary?: boolean;
  includePhotos?: boolean;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface ExportTripResponseDTO {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  format: string;
  generatedAt: Date;
  expiresAt: Date;
}

// Mappers para invitaciones
export class TripInvitationDTOMapper {
  public static validateSendInvitationDTO(dto: SendTripInvitationDTO): string[] {
    const errors: string[] = [];

    if (!dto.email?.trim()) {
      errors.push('El email es requerido');
    }

    if (dto.email && !this.isValidEmail(dto.email)) {
      errors.push('El formato del email es inválido');
    }

    if (dto.message && dto.message.length > 500) {
      errors.push('El mensaje no puede exceder 500 caracteres');
    }

    return errors;
  }

  public static validateBulkInviteDTO(dto: BulkInviteMembersDTO): string[] {
    const errors: string[] = [];

    if (!dto.invitations || dto.invitations.length === 0) {
      errors.push('Se requiere al menos una invitación');
    }

    if (dto.invitations && dto.invitations.length > 20) {
      errors.push('No se pueden enviar más de 20 invitaciones a la vez');
    }

    dto.invitations?.forEach((invitation, index) => {
      const invitationErrors = this.validateSendInvitationDTO(invitation);
      invitationErrors.forEach(error => {
        errors.push(`Invitación ${index + 1}: ${error}`);
      });
    });

    // Verificar emails duplicados
    const emails = dto.invitations?.map(inv => inv.email.toLowerCase()) || [];
    const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
    if (duplicates.length > 0) {
      errors.push('No se pueden enviar invitaciones duplicadas al mismo email');
    }

    return errors;
  }

  public static validateExportDTO(dto: ExportTripDTO): string[] {
    const errors: string[] = [];

    if (!dto.format) {
      errors.push('El formato es requerido');
    }

    if (!['pdf', 'excel'].includes(dto.format)) {
      errors.push('El formato debe ser "pdf" o "excel"');
    }

    if (dto.dateRange) {
      if (!dto.dateRange.startDate || !dto.dateRange.endDate) {
        errors.push('Si se especifica rango de fechas, ambas fechas son requeridas');
      }

      if (dto.dateRange.startDate && dto.dateRange.endDate) {
        const startDate = new Date(dto.dateRange.startDate);
        const endDate = new Date(dto.dateRange.endDate);
        
        if (startDate >= endDate) {
          errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
        }
      }
    }

    return errors;
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}