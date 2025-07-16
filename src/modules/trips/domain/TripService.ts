// src/modules/trips/domain/TripService.ts
import { Trip, TripStatus } from './Trip';
import { TripMember, TripMemberRole, TripMemberStatus } from './TripMember';
import { ITripRepository } from './interfaces/ITripRepository';
import { ITripMemberRepository } from './interfaces/ITripMemberRepository';
import { IUserRepository } from '../../users/domain/interfaces/IUserRepository';

export class TripService {
  constructor(
    private tripRepository: ITripRepository,
    private tripMemberRepository: ITripMemberRepository,
    private userRepository: IUserRepository
  ) {}

  // Validaciones de negocio
  public async validateTripCreation(userId: string, startDate: Date, endDate: Date): Promise<void> {
    // Validar que el usuario existe
    const user = await this.userRepository.findById(userId);
    if (!user || user.isDeleted) {
      throw new Error('Usuario no encontrado');
    }

    // Validar fechas
    if (startDate >= endDate) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    if (startDate < new Date()) {
      throw new Error('La fecha de inicio no puede ser en el pasado');
    }

    // Validar que no haya conflictos de fechas con otros viajes activos
    const conflictingTrips = await this.tripRepository.findByDateRange(startDate, endDate, userId);
    const activeConflicts = conflictingTrips.filter(trip => 
      trip.status === TripStatus.ACTIVE && !trip.isDeleted
    );

    if (activeConflicts.length > 0) {
      throw new Error('Ya tienes un viaje activo en esas fechas');
    }
  }

  public async validateTripUpdate(tripId: string, userId: string, updateData: any): Promise<void> {
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw new Error('Viaje no encontrado');
    }

    // Validar permisos de edición
    const canEdit = await this.canUserEditTrip(tripId, userId);
    if (!canEdit) {
      throw new Error('No tienes permisos para editar este viaje');
    }

    // Validar que el viaje no está cancelado
    if (trip.status === TripStatus.CANCELLED) {
      throw new Error('No se puede editar un viaje cancelado');
    }

    // Validar fechas si se están actualizando
    if (updateData.startDate || updateData.endDate) {
      const startDate = updateData.startDate || trip.startDate;
      const endDate = updateData.endDate || trip.endDate;

      if (startDate >= endDate) {
        throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
      }
    }
  }

  public async validateTripDeletion(tripId: string, userId: string): Promise<void> {
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw new Error('Viaje no encontrado');
    }

    // Solo el dueño puede eliminar el viaje
    const isOwner = await this.tripMemberRepository.isUserOwnerOfTrip(tripId, userId);
    if (!isOwner) {
      throw new Error('Solo el organizador puede eliminar el viaje');
    }

    if (trip.isDeleted) {
      throw new Error('El viaje ya está eliminado');
    }
  }

  // Validaciones de membresía
  public async validateMemberInvitation(tripId: string, inviterId: string, invitedUserId: string): Promise<void> {
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw new Error('Viaje no encontrado');
    }

    if (!trip.isGroupTrip) {
      throw new Error('Este viaje no es grupal');
    }

    // Validar que el invitador puede invitar
    const inviter = await this.tripMemberRepository.findByTripAndUser(tripId, inviterId);
    if (!inviter || !inviter.canInviteMembers()) {
      throw new Error('No tienes permisos para invitar miembros');
    }

    // Validar que el usuario invitado existe
    const invitedUser = await this.userRepository.findById(invitedUserId);
    if (!invitedUser || invitedUser.isDeleted) {
      throw new Error('Usuario invitado no encontrado');
    }

    // Validar que no sea el mismo usuario
    if (inviterId === invitedUserId) {
      throw new Error('No puedes invitarte a ti mismo');
    }

    // Validar que no ya es miembro
    const existingMember = await this.tripMemberRepository.findByTripAndUser(tripId, invitedUserId);
    if (existingMember && existingMember.status !== TripMemberStatus.REJECTED) {
      throw new Error('Este usuario ya es miembro o tiene una invitación pendiente');
    }
  }

  public async validateMemberRoleUpdate(tripId: string, updaterId: string, targetUserId: string, newRole: TripMemberRole): Promise<void> {
    // Validar que el actualizador tiene permisos
    const updater = await this.tripMemberRepository.findByTripAndUser(tripId, updaterId);
    if (!updater || !updater.isOwner()) {
      throw new Error('Solo el organizador puede cambiar roles');
    }

    // Validar que el usuario objetivo existe en el viaje
    const targetMember = await this.tripMemberRepository.findByTripAndUser(tripId, targetUserId);
    if (!targetMember || !targetMember.isAccepted()) {
      throw new Error('Usuario no encontrado en el viaje');
    }

    // No se puede cambiar el rol del dueño
    if (targetMember.isOwner()) {
      throw new Error('No se puede cambiar el rol del organizador');
    }

    // No se puede asignar rol de dueño a otro usuario
    if (newRole === TripMemberRole.OWNER) {
      throw new Error('No se puede asignar el rol de organizador a otro usuario');
    }
  }

  // Métodos auxiliares de permisos
  public async canUserEditTrip(tripId: string, userId: string): Promise<boolean> {
    const member = await this.tripMemberRepository.findByTripAndUser(tripId, userId);
    return member ? member.canEditTrip() : false;
  }

  public async canUserDeleteTrip(tripId: string, userId: string): Promise<boolean> {
    const member = await this.tripMemberRepository.findByTripAndUser(tripId, userId);
    return member ? member.canDeleteTrip() : false;
  }

  public async canUserInviteMembers(tripId: string, userId: string): Promise<boolean> {
    const member = await this.tripMemberRepository.findByTripAndUser(tripId, userId);
    return member ? member.canInviteMembers() : false;
  }

  public async canUserManageExpenses(tripId: string, userId: string): Promise<boolean> {
    const member = await this.tripMemberRepository.findByTripAndUser(tripId, userId);
    return member ? member.canManageExpenses() : false;
  }

  public async canUserAccessTrip(tripId: string, userId: string): Promise<boolean> {
    return await this.tripMemberRepository.canUserAccessTrip(tripId, userId);
  }

  // Métodos de cálculo y estadísticas
  public calculateTripProgress(trip: Trip): number {
    // Lógica básica de progreso - puede expandirse con otras entidades
    let progress = 0;
    
    // 20% por tener título y destino
    if (trip.title && trip.destination) progress += 20;
    
    // 20% por tener fechas válidas
    if (trip.validateDates()) progress += 20;
    
    // 20% por tener presupuesto
    if (trip.estimatedBudget && trip.estimatedBudget > 0) progress += 20;
    
    // 20% por tener descripción
    if (trip.description && trip.description.length > 10) progress += 20;
    
    // 20% por estar activo
    if (trip.status === TripStatus.ACTIVE) progress += 20;
    
    return Math.min(100, progress);
  }

  public async getTripMemberCount(tripId: string): Promise<number> {
    return await this.tripMemberRepository.countActiveMembersByTripId(tripId);
  }

  public async getTripOwner(tripId: string): Promise<TripMember | null> {
    return await this.tripMemberRepository.findTripOwner(tripId);
  }

  public async getTripAdmins(tripId: string): Promise<TripMember[]> {
    return await this.tripMemberRepository.findTripAdmins(tripId);
  }

  // Métodos de limpieza y mantenimiento
  public async cleanupExpiredInvitations(): Promise<number> {
    const daysToKeep = 30; // Mantener invitaciones rechazadas por 30 días
    return await this.tripMemberRepository.cleanupRejectedInvitations(daysToKeep);
  }

  public async transferTripOwnership(tripId: string, currentOwnerId: string, newOwnerId: string): Promise<void> {
    // Validar que el usuario actual es el dueño
    const currentOwner = await this.tripMemberRepository.findByTripAndUser(tripId, currentOwnerId);
    if (!currentOwner || !currentOwner.isOwner()) {
      throw new Error('Solo el organizador actual puede transferir la propiedad');
    }

    // Validar que el nuevo dueño es miembro activo
    const newOwner = await this.tripMemberRepository.findByTripAndUser(tripId, newOwnerId);
    if (!newOwner || !newOwner.isAccepted()) {
      throw new Error('El nuevo organizador debe ser un miembro activo del viaje');
    }

    // Cambiar roles
    currentOwner.updateRole(TripMemberRole.ADMIN);
    newOwner.updateRole(TripMemberRole.OWNER);

    // Guardar cambios
    await this.tripMemberRepository.update(currentOwner);
    await this.tripMemberRepository.update(newOwner);
  }

  // Validaciones específicas para exportación
  public async validateTripExport(tripId: string, userId: string): Promise<void> {
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw new Error('Viaje no encontrado');
    }

    const canAccess = await this.canUserAccessTrip(tripId, userId);
    if (!canAccess) {
      throw new Error('No tienes permisos para exportar este viaje');
    }

    if (trip.isDeleted) {
      throw new Error('No se puede exportar un viaje eliminado');
    }
  }
}