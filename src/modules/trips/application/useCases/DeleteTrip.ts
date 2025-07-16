// src/modules/trips/application/useCases/DeleteTrip.ts
import { ITripRepository } from '../../domain/interfaces/ITripRepository';
import { ITripMemberRepository } from '../../domain/interfaces/ITripMemberRepository';
import { TripService } from '../../domain/TripService';
import { EventBus } from '../../../../shared/events/EventBus';
import { TRIP_EVENT_TYPES } from '../../domain/TripEvents';

export class DeleteTripUseCase {
  constructor(
    private tripRepository: ITripRepository,
    private tripMemberRepository: ITripMemberRepository,
    private tripService: TripService,
    private eventBus: EventBus
  ) {}

  public async execute(tripId: string, userId: string): Promise<{ message: string }> {
    // Validar eliminación
    await this.tripService.validateTripDeletion(tripId, userId);

    // Obtener el viaje
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw new Error('Viaje no encontrado');
    }

    // Obtener información para el evento antes de eliminar
    const memberCount = await this.tripService.getTripMemberCount(tripId);
    const tripTitle = trip.title;

    // Eliminar viaje (soft delete)
    trip.softDelete();
    await this.tripRepository.update(trip);

    // Desactivar todos los miembros
    const members = await this.tripMemberRepository.findActiveMembersByTripId(tripId);
    for (const member of members) {
      member.leave();
      await this.tripMemberRepository.update(member);
    }

    // Emitir evento
    const event = {
      eventId: `trip_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: TRIP_EVENT_TYPES.TRIP_DELETED,
      tripId,
      userId,
      timestamp: new Date(),
      data: {
        tripId,
        tripTitle,
        memberCount
      }
    };

    await this.eventBus.publish(event);

    return {
      message: 'Viaje eliminado exitosamente'
    };
  }
}