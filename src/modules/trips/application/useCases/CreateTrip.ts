// src/modules/trips/application/useCases/CreateTrip.ts
import { Trip, TripMemberRole } from '../../domain/Trip';
import { TripMember } from '../../domain/TripMember';
import { TripService } from '../../domain/TripService';
import { ITripRepository } from '../../domain/interfaces/ITripRepository';
import { ITripMemberRepository } from '../../domain/interfaces/ITripMemberRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { EventBus } from '../../../../shared/events/EventBus';
import { TripEvents } from '../../domain/TripEvents';
import { CreateTripDTO, TripResponseDTO, TripDTOMapper } from '../dtos/TripDTO';

export class CreateTripUseCase {
  constructor(
    private tripRepository: ITripRepository,
    private tripMemberRepository: ITripMemberRepository,
    private userRepository: IUserRepository,
    private tripService: TripService,
    private eventBus: EventBus
  ) {}

  public async execute(userId: string, dto: CreateTripDTO): Promise<TripResponseDTO> {
    // Validar DTO
    const validationErrors = TripDTOMapper.validateCreateDTO(dto);
    if (validationErrors.length > 0) {
      throw new Error(`Datos inválidos: ${validationErrors.join(', ')}`);
    }

    // Validar fechas y usuario
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    
    await this.tripService.validateTripCreation(userId, startDate, endDate);

    // Crear el viaje
    const trip = new Trip({
      userId,
      title: dto.title.trim(),
      destination: dto.destination.trim(),
      description: dto.description?.trim(),
      startDate,
      endDate,
      estimatedBudget: dto.estimatedBudget,
      baseCurrency: dto.baseCurrency,
      isGroupTrip: dto.isGroupTrip || false,
      category: dto.category,
      image: dto.image
    });

    // Calcular progreso inicial
    const initialProgress = this.tripService.calculateTripProgress(trip);
    trip.updatePlanningProgress(initialProgress);

    // Guardar el viaje
    await this.tripRepository.create(trip);

    // Crear membresía del creador como owner
    const ownerMember = new TripMember({
      tripId: trip.id,
      userId,
      role: TripMemberRole.OWNER
    });

    await this.tripMemberRepository.create(ownerMember);

    // Emitir evento
    const event = TripEvents.createTripCreatedEvent(trip, userId);
    await this.eventBus.publish(event);

    // Obtener conteo de miembros y rol del usuario
    const memberCount = await this.tripService.getTripMemberCount(trip.id);
    const userRole = ownerMember.roleLabel;

    return TripDTOMapper.toResponseDTO(trip, memberCount, userRole);
  }
}