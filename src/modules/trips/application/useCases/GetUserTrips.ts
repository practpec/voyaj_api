// src/modules/trips/application/useCases/GetUserTrips.ts
import { ITripRepository } from '../../domain/interfaces/ITripRepository';
import { ITripMemberRepository } from '../../domain/interfaces/ITripMemberRepository';
import { TripService } from '../../domain/TripService';
import { TripFiltersDTO, TripListResponseDTO, TripDTOMapper } from '../dtos/TripDTO';

export class GetUserTripsUseCase {
  constructor(
    private tripRepository: ITripRepository,
    private tripMemberRepository: ITripMemberRepository,
    private tripService: TripService
  ) {}

  public async execute(userId: string, filters?: TripFiltersDTO): Promise<TripListResponseDTO> {
    // Configurar filtros por defecto
    const searchFilters = {
      userId,
      status: filters?.status,
      category: filters?.category,
      isGroupTrip: filters?.isGroupTrip,
      destination: filters?.destination,
      startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
      isActive: true, // Solo viajes activos (no eliminados)
      limit: filters?.limit || 20,
      offset: filters?.offset || 0
    };

    // Obtener viajes del usuario
    const trips = await this.tripRepository.findWithFilters(searchFilters);
    const total = await this.tripRepository.countByFilters(searchFilters);

    // Enriquecer cada viaje con información adicional
    const enrichedTrips = await Promise.all(
      trips.map(async (trip) => {
        // Obtener conteo de miembros
        const memberCount = await this.tripService.getTripMemberCount(trip.id);
        
        // Obtener rol del usuario en este viaje
        const member = await this.tripMemberRepository.findByTripAndUser(trip.id, userId);
        const userRole = member?.roleLabel;

        return TripDTOMapper.toResponseDTO(trip, memberCount, userRole);
      })
    );

    // Calcular paginación
    const page = Math.floor((filters?.offset || 0) / (filters?.limit || 20)) + 1;
    const limit = filters?.limit || 20;

    return TripDTOMapper.toListResponseDTO(enrichedTrips, total, page, limit);
  }
}