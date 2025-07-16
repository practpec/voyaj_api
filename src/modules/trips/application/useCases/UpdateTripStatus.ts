// src/modules/trips/application/useCases/UpdateTripStatus.ts
import { TripStatus } from '../../domain/Trip';
import { ITripRepository } from '../../domain/interfaces/ITripRepository';
import { ITripMemberRepository } from '../../domain/interfaces/ITripMemberRepository';
import { TripService } from '../../domain/TripService';
import { EventBus } from '../../../../shared/events/EventBus';
import { TRIP_EVENT_TYPES } from '../../domain/TripEvents';
import { UpdateTripStatusDTO, TripResponseDTO, TripDTOMapper } from '../dtos/TripDTO';

export class UpdateTripStatusUseCase {
  constructor(
    private tripRepository: ITripRepository,
    private tripMemberRepository: ITripMemberRepository,
    private tripService: TripService,
    private eventBus: EventBus
  ) {}

  public async execute(
    tripId: string,
    userId: string,
    dto: UpdateTripStatusDTO
  ): Promise<TripResponseDTO> {
    // Validar datos
    if (!Object.values(TripStatus).includes(dto.status)) {
      throw new Error('Estado de viaje inválido');
    }

    // Verificar permisos
    const canEdit = await this.tripService.canUserEditTrip(tripId, userId);
    if (!canEdit) {
      throw new Error('No tienes permisos para cambiar el estado de este viaje');
    }

    // Obtener el viaje
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw new Error('Viaje no encontrado');
    }

    if (trip.isDeleted) {
      throw new Error('No se puede cambiar el estado de un viaje eliminado');
    }

    // Validar transiciones de estado
    const previousStatus = trip.status;
    
    if (previousStatus === dto.status) {
      throw new Error('El viaje ya está en ese estado');
    }

    // Validaciones específicas por estado
    if (dto.status === TripStatus.ACTIVE && previousStatus !== TripStatus.DRAFT) {
      throw new Error('Solo se puede activar un viaje en estado borrador');
    }

    if (dto.status === TripStatus.COMPLETED) {
      const now = new Date();
      if (trip.endDate > now) {
        throw new Error('No se puede completar un viaje que aún no ha terminado');
      }
    }

    // Actualizar estado
    trip.updateStatus(dto.status);
    await this.tripRepository.update(trip);

    // Emitir evento específico según el nuevo estado
    let eventType = TRIP_EVENT_TYPES.TRIP_STATUS_CHANGED;
    if (dto.status === TripStatus.COMPLETED) {
      eventType = TRIP_EVENT_TYPES.TRIP_COMPLETED;
    } else if (dto.status === TripStatus.CANCELLED) {
      eventType = TRIP_EVENT_TYPES.TRIP_CANCELLED;
    }

    const memberCount = await this.tripService.getTripMemberCount(tripId);

    const event = {
      eventId: `trip_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      tripId,
      userId,
      timestamp: new Date(),
      data: {
        trip,
        previousStatus,
        newStatus: dto.status,
        reason: dto.reason,
        ...(dto.status === TripStatus.COMPLETED && {
          totalExpenses: trip.actualExpense,
          memberCount,
          duration: trip.getTripDuration()
        }),
        ...(dto.status === TripStatus.CANCELLED && {
          memberCount
        })
      }
    };

    await this.eventBus.publish(event);

    // Obtener información adicional para la respuesta
    const member = await this.tripMemberRepository.findByTripAndUser(tripId, userId);
    const userRole = member?.roleLabel;

    return TripDTOMapper.toResponseDTO(trip, memberCount, userRole);
  }
}