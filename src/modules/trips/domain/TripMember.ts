// src/modules/trips/domain/TripMember.ts
import { ObjectId } from 'mongodb';

export interface ITripMemberCreationParams {
  tripId: string;
  userId: string;
  role: TripMemberRole;
  invitedBy?: string;
  permissions?: TripMemberPermissions;
}

export enum TripMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member'
}

export enum TripMemberStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  LEFT = 'left'
}

export interface TripMemberPermissions {
  canInviteMembers: boolean;
  canManageActivities: boolean;
  canManageExpenses: boolean;
  canEditTrip: boolean;
  canDeleteTrip: boolean;
}

export class TripMember {
  public _id: ObjectId;
  public tripId: string;
  public userId: string;
  public role: TripMemberRole;
  public status: TripMemberStatus;
  public permissions: TripMemberPermissions;
  public invitedBy?: string;
  public invitedAt: Date;
  public acceptedAt?: Date;
  public rejectedAt?: Date;
  public leftAt?: Date;
  public notes?: string;
  public isActive: boolean;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(params: ITripMemberCreationParams) {
    this._id = new ObjectId();
    this.tripId = params.tripId;
    this.userId = params.userId;
    this.role = params.role;
    this.status = params.role === TripMemberRole.OWNER ? TripMemberStatus.ACCEPTED : TripMemberStatus.PENDING;
    this.permissions = params.permissions || this.getDefaultPermissions(params.role);
    this.invitedBy = params.invitedBy;
    this.invitedAt = new Date();
    this.isActive = true;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Métodos de negocio
  public accept(): void {
    this.status = TripMemberStatus.ACCEPTED;
    this.acceptedAt = new Date();
    this.updatedAt = new Date();
  }

  public reject(): void {
    this.status = TripMemberStatus.REJECTED;
    this.rejectedAt = new Date();
    this.isActive = false;
    this.updatedAt = new Date();
  }

  public leave(): void {
    this.status = TripMemberStatus.LEFT;
    this.leftAt = new Date();
    this.isActive = false;
    this.updatedAt = new Date();
  }

  public updateRole(newRole: TripMemberRole): void {
    this.role = newRole;
    this.permissions = this.getDefaultPermissions(newRole);
    this.updatedAt = new Date();
  }

  public updatePermissions(newPermissions: Partial<TripMemberPermissions>): void {
    this.permissions = { ...this.permissions, ...newPermissions };
    this.updatedAt = new Date();
  }

  public updateNotes(notes: string): void {
    this.notes = notes;
    this.updatedAt = new Date();
  }

  // Validaciones y permisos
  public canInviteMembers(): boolean {
    return this.isActive && this.status === TripMemberStatus.ACCEPTED && this.permissions.canInviteMembers;
  }

  public canManageActivities(): boolean {
    return this.isActive && this.status === TripMemberStatus.ACCEPTED && this.permissions.canManageActivities;
  }

  public canManageExpenses(): boolean {
    return this.isActive && this.status === TripMemberStatus.ACCEPTED && this.permissions.canManageExpenses;
  }

  public canEditTrip(): boolean {
    return this.isActive && this.status === TripMemberStatus.ACCEPTED && this.permissions.canEditTrip;
  }

  public canDeleteTrip(): boolean {
    return this.isActive && this.status === TripMemberStatus.ACCEPTED && this.permissions.canDeleteTrip;
  }

  public isOwner(): boolean {
    return this.role === TripMemberRole.OWNER;
  }

  public isAdmin(): boolean {
    return this.role === TripMemberRole.ADMIN;
  }

  public isMember(): boolean {
    return this.role === TripMemberRole.MEMBER;
  }

  public isPending(): boolean {
    return this.status === TripMemberStatus.PENDING;
  }

  public isAccepted(): boolean {
    return this.status === TripMemberStatus.ACCEPTED;
  }

  public canChangeRole(): boolean {
    return !this.isOwner() && this.isAccepted();
  }

  public canLeave(): boolean {
    return !this.isOwner() && this.isAccepted();
  }

  // Métodos auxiliares
  private getDefaultPermissions(role: TripMemberRole): TripMemberPermissions {
    switch (role) {
      case TripMemberRole.OWNER:
        return {
          canInviteMembers: true,
          canManageActivities: true,
          canManageExpenses: true,
          canEditTrip: true,
          canDeleteTrip: true
        };
      case TripMemberRole.ADMIN:
        return {
          canInviteMembers: true,
          canManageActivities: true,
          canManageExpenses: true,
          canEditTrip: true,
          canDeleteTrip: false
        };
      case TripMemberRole.MEMBER:
        return {
          canInviteMembers: false,
          canManageActivities: false,
          canManageExpenses: false,
          canEditTrip: false,
          canDeleteTrip: false
        };
    }
  }

  // Getters
  public get id(): string {
    return this._id.toString();
  }

  public get hasFullAccess(): boolean {
    return this.isOwner() || this.isAdmin();
  }

  public get statusLabel(): string {
    switch (this.status) {
      case TripMemberStatus.PENDING:
        return 'Invitación pendiente';
      case TripMemberStatus.ACCEPTED:
        return 'Miembro activo';
      case TripMemberStatus.REJECTED:
        return 'Invitación rechazada';
      case TripMemberStatus.LEFT:
        return 'Abandonó el viaje';
    }
  }

  public get roleLabel(): string {
    switch (this.role) {
      case TripMemberRole.OWNER:
        return 'Organizador';
      case TripMemberRole.ADMIN:
        return 'Administrador';
      case TripMemberRole.MEMBER:
        return 'Miembro';
    }
  }

  // Métodos de serialización
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      tripId: this.tripId,
      userId: this.userId,
      role: this.role,
      roleLabel: this.roleLabel,
      status: this.status,
      statusLabel: this.statusLabel,
      permissions: this.permissions,
      invitedBy: this.invitedBy,
      invitedAt: this.invitedAt,
      acceptedAt: this.acceptedAt,
      rejectedAt: this.rejectedAt,
      leftAt: this.leftAt,
      notes: this.notes,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}