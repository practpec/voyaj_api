// src/modules/trips/application/useCases/LeaveTrip.ts
import { ITripRepository } from '../../domain/interfaces/ITripRepository';
import { ITripMemberRepository } from '../../domain/interfaces/ITripMemberRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { EventBus } from '../../../../shared/events/EventBus';
import { TRIP_EVENT_TYPES } from '../../domain/TripEvents';

export class LeaveTripUseCase {
  constructor(
    private tripRepository: ITripRepository,
    private tripMemberRepository: ITripMemberRepository,
    private userRepository: IUserRepository,
    private eventBus: EventBus
  ) {}

  public async execute(
    tripId: string,
    userId: string,
    reason?: string
  ): Promise<{ message: string }> {
    // Buscar el miembro
    const member = await this.tripMemberRepository.findByTripAndUser(tripId, userId);
    if (!member) {
      throw new Error('No eres miembro de este viaje');
    }

    if (!member.isAccepted()) {
      throw new Error('No puedes salir de un viaje al que no te has unido');
    }

    // El owner no puede salir sin transferir la propiedad
    if (member.isOwner()) {
      const activeMembers = await this.tripMemberRepository.findActiveMembersByTripId(tripId);
      const otherMembers = activeMembers.filter(m => m.userId !== userId);
      
      if (otherMembers.length > 0) {
        throw new Error('Como organizador, debes transferir la propiedad a otro miembro antes de salir o eliminar el viaje');
      }
    }

    // Obtener información para el evento
    const trip = await this.tripRepository.findById(tripId);
    const user = await this.userRepository.findById(userId);

    if (!trip || !user) {
      throw new Error('Información no encontrada');
    }

    // Si es el último miembro y es owner, eliminar el viaje
    if (member.isOwner()) {
      trip.softDelete();
      await this.tripRepository.update(trip);
    }

    // Salir del viaje
    member.leave();
    await this.tripMemberRepository.update(member);

    // Emitir evento
    const event = {
      eventId: `trip_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: TRIP_EVENT_TYPES.MEMBER_LEFT,
      tripId,
      userId,
      timestamp: new Date(),
      data: {
        tripMember: member,
        memberName: `${user.firstName} ${user.lastName}`,
        tripTitle: trip.title,
        reason
      }
    };

    await this.eventBus.publish(event);

    return {
      message: member.isOwner() 
        ? 'Has salido del viaje y este ha sido eliminado'
        : 'Has salido del viaje exitosamente'
    };
  }
}