// src/modules/trips/application/useCases/GetTrip.ts
import { ITripRepository } from '../../domain/interfaces/ITripRepository';
import { ITripMemberRepository } from '../../domain/interfaces/ITripMemberRepository';
import { TripService } from '../../domain/TripService';
import { TripResponseDTO, TripDTOMapper } from '../dtos/TripDTO';

export class GetTripUseCase {
  constructor(
    private tripRepository: ITripRepository,
    private tripMemberRepository: ITripMemberRepository,
    private tripService: TripService
  ) {}

  public async execute(tripId: string, userId: string): Promise<TripResponseDTO> {
    // Buscar el viaje
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw new Error('Viaje no encontrado');
    }

    if (trip.isDeleted) {
      throw new Error('Viaje no disponible');
    }

    // Verificar permisos de acceso
    const canAccess = await this.tripService.canUserAccessTrip(tripId, userId);
    if (!canAccess) {
      throw new Error('No tienes permisos para ver este viaje');
    }

    // Obtener información del miembro
    const member = await this.tripMemberRepository.findByTripAndUser(tripId, userId);
    const userRole = member?.roleLabel;

    // Obtener conteo de miembros
    const memberCount = await this.tripService.getTripMemberCount(tripId);

    return TripDTOMapper.toResponseDTO(trip, memberCount, userRole);
  }
}