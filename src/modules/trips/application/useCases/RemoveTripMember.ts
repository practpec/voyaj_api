// src/modules/trips/application/useCases/RemoveTripMember.ts
import { ITripRepository } from '../../domain/interfaces/ITripRepository';
import { ITripMemberRepository } from '../../domain/interfaces/ITripMemberRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { TripService } from '../../domain/TripService';
import { EventBus } from '../../../../shared/events/EventBus';
import { TRIP_EVENT_TYPES } from '../../domain/TripEvents';

export class RemoveTripMemberUseCase {
  constructor(
    private tripRepository: ITripRepository,
    private tripMemberRepository: ITripMemberRepository,
    private userRepository: IUserRepository,
    private tripService: TripService,
    private eventBus: EventBus
  ) {}

  public async execute(
    tripId: string,
    removerId: string,
    targetUserId: string,
    reason?: string
  ): Promise<{ message: string }> {
    // Validar que el removedor tiene permisos
    const remover = await this.tripMemberRepository.findByTripAndUser(tripId, removerId);
    if (!remover || !remover.canInviteMembers()) {
      throw new Error('No tienes permisos para remover miembros');
    }

    // Buscar el miembro a remover
    const targetMember = await this.tripMemberRepository.findByTripAndUser(tripId, targetUserId);
    if (!targetMember) {
      throw new Error('Miembro no encontrado');
    }

    // No se puede remover al owner
    if (targetMember.isOwner()) {
      throw new Error('No se puede remover al organizador del viaje');
    }

    // No se puede remover a sí mismo (usar LeaveTrip para eso)
    if (removerId === targetUserId) {
      throw new Error('No puedes removerte a ti mismo. Usa la opción "Salir del viaje"');
    }

    // Solo el owner puede remover admins
    if (targetMember.isAdmin() && !remover.isOwner()) {
      throw new Error('Solo el organizador puede remover administradores');
    }

    // Obtener información para el evento
    const trip = await this.tripRepository.findById(tripId);
    const targetUser = await this.userRepository.findById(targetUserId);
    const removerUser = await this.userRepository.findById(removerId);

    if (!trip || !targetUser || !removerUser) {
      throw new Error('Información no encontrada');
    }

    // Remover miembro (desactivar)
    targetMember.leave();
    await this.tripMemberRepository.update(targetMember);

    // Emitir evento
    const event = {
      eventId: `trip_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: TRIP_EVENT_TYPES.MEMBER_REMOVED,
      tripId,
      userId: removerId,
      timestamp: new Date(),
      data: {
        tripMember: targetMember,
        removedMemberName: `${targetUser.firstName} ${targetUser.lastName}`,
        removedByName: `${removerUser.firstName} ${removerUser.lastName}`,
        tripTitle: trip.title,
        reason
      }
    };

    await this.eventBus.publish(event);

    return {
      message: `${targetUser.firstName} ${targetUser.lastName} ha sido removido del viaje`
    };
  }
}