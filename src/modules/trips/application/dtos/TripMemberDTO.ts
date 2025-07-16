// src/modules/trips/application/dtos/TripMemberDTO.ts
import { TripMemberRole, TripMemberStatus, TripMemberPermissions } from '../../domain/TripMember';

// DTOs de entrada
export interface InviteMemberDTO {
  userId: string;
  role?: TripMemberRole;
  permissions?: Partial<TripMemberPermissions>;
}

export interface UpdateMemberRoleDTO {
  role: TripMemberRole;
  permissions?: Partial<TripMemberPermissions>;
}

export interface HandleInvitationDTO {
  action: 'accept' | 'reject';
  reason?: string;
}

export interface UpdateMemberNotesDTO {
  notes: string;
}

export interface TripMemberFiltersDTO {
  role?: TripMemberRole;
  status?: TripMemberStatus;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

// DTOs de salida
export interface TripMemberResponseDTO {
  id: string;
  tripId: string;
  userId: string;
  userInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  role: TripMemberRole;
  roleLabel: string;
  status: TripMemberStatus;
  statusLabel: string;
  permissions: TripMemberPermissions;
  invitedBy?: string;
  inviterInfo?: {
    firstName: string;
    lastName: string;
  };
  invitedAt: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  leftAt?: Date;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripMemberListResponseDTO {
  members: TripMemberResponseDTO[];
  total: number;
  activeMembers: number;
  pendingInvitations: number;
  stats: {
    owners: number;
    admins: number;
    members: number;
  };
}

export interface TripMemberStatsDTO {
  totalMembers: number;
  activeMembers: number;
  pendingInvitations: number;
  rejectedInvitations: number;
  membersByRole: {
    owners: number;
    admins: number;
    members: number;
  };
  recentActivity: {
    newMembers: number;
    leftMembers: number;
    pendingInvitations: number;
  };
}

// Mapper para conversión
export class TripMemberDTOMapper {
  public static toResponseDTO(
    tripMember: any, 
    userInfo?: any, 
    inviterInfo?: any
  ): TripMemberResponseDTO {
    return {
      id: tripMember.id,
      tripId: tripMember.tripId,
      userId: tripMember.userId,
      userInfo: userInfo ? {
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email: userInfo.email,
        avatar: userInfo.avatar
      } : undefined,
      role: tripMember.role,
      roleLabel: tripMember.roleLabel,
      status: tripMember.status,
      statusLabel: tripMember.statusLabel,
      permissions: tripMember.permissions,
      invitedBy: tripMember.invitedBy,
      inviterInfo: inviterInfo ? {
        firstName: inviterInfo.firstName,
        lastName: inviterInfo.lastName
      } : undefined,
      invitedAt: tripMember.invitedAt,
      acceptedAt: tripMember.acceptedAt,
      rejectedAt: tripMember.rejectedAt,
      leftAt: tripMember.leftAt,
      notes: tripMember.notes,
      isActive: tripMember.isActive,
      createdAt: tripMember.createdAt,
      updatedAt: tripMember.updatedAt
    };
  }

  public static toListResponseDTO(
    members: TripMemberResponseDTO[],
    total: number,
    activeMembers: number,
    pendingInvitations: number
  ): TripMemberListResponseDTO {
    const stats = {
      owners: members.filter(m => m.role === TripMemberRole.OWNER).length,
      admins: members.filter(m => m.role === TripMemberRole.ADMIN).length,
      members: members.filter(m => m.role === TripMemberRole.MEMBER).length
    };

    return {
      members,
      total,
      activeMembers,
      pendingInvitations,
      stats
    };
  }

  public static validateInviteDTO(dto: InviteMemberDTO): string[] {
    const errors: string[] = [];

    if (!dto.userId?.trim()) {
      errors.push('El ID del usuario es requerido');
    }

    if (dto.role && !Object.values(TripMemberRole).includes(dto.role)) {
      errors.push('Rol de miembro inválido');
    }

    // No permitir invitar como owner
    if (dto.role === TripMemberRole.OWNER) {
      errors.push('No se puede invitar a un usuario como organizador');
    }

    return errors;
  }

  public static validateUpdateRoleDTO(dto: UpdateMemberRoleDTO): string[] {
    const errors: string[] = [];

    if (!dto.role) {
      errors.push('El rol es requerido');
    }

    if (!Object.values(TripMemberRole).includes(dto.role)) {
      errors.push('Rol de miembro inválido');
    }

    // No permitir cambiar a owner
    if (dto.role === TripMemberRole.OWNER) {
      errors.push('No se puede asignar el rol de organizador');
    }

    return errors;
  }

  public static validateHandleInvitationDTO(dto: HandleInvitationDTO): string[] {
    const errors: string[] = [];

    if (!dto.action) {
      errors.push('La acción es requerida');
    }

    if (!['accept', 'reject'].includes(dto.action)) {
      errors.push('La acción debe ser "accept" o "reject"');
    }

    if (dto.reason && dto.reason.length > 500) {
      errors.push('La razón no puede exceder 500 caracteres');
    }

    return errors;
  }

  public static validateNotesDTO(dto: UpdateMemberNotesDTO): string[] {
    const errors: string[] = [];

    if (dto.notes && dto.notes.length > 1000) {
      errors.push('Las notas no pueden exceder 1000 caracteres');
    }

    return errors;
  }
}