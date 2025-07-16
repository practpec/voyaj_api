// src/modules/trips/application/useCases/UpdateTrip.ts
import { ITripRepository } from '../../domain/interfaces/ITripRepository';
import { ITripMemberRepository } from '../../domain/interfaces/ITripMemberRepository';
import { TripService } from '../../domain/TripService';
import { EventBus } from '../../../../shared/events/EventBus';
import { TripEvents } from '../../domain/TripEvents';
import { UpdateTripDTO, TripResponseDTO, TripDTOMapper } from '../dtos/TripDTO';

export class UpdateTripUseCase {
  constructor(
    private tripRepository: ITripRepository,
    private tripMemberRepository: ITripMemberRepository,
    private tripService: TripService,
    private eventBus: EventBus
  ) {}

  public async execute(tripId: string, userId: string, dto: UpdateTripDTO): Promise<TripResponseDTO> {
    // Validar DTO
    const validationErrors = TripDTOMapper.validateUpdateDTO(dto);
    if (validationErrors.length > 0) {
      throw new Error(`Datos inválidos: ${validationErrors.join(', ')}`);
    }

    // Validar actualización
    await this.tripService.validateTripUpdate(tripId, userId, dto);

    // Obtener el viaje actual
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw new Error('Viaje no encontrado');
    }

    // Guardar datos anteriores para el evento
    const previousData = { ...trip };
    const changedFields: string[] = [];

    // Aplicar actualizaciones
    const updateParams: any = {};
    
    if (dto.title !== undefined && dto.title !== trip.title) {
      updateParams.title = dto.title.trim();
      changedFields.push('title');
    }
    
    if (dto.destination !== undefined && dto.destination !== trip.destination) {
      updateParams.destination = dto.destination.trim();
      changedFields.push('destination');
    }
    
    if (dto.description !== undefined && dto.description !== trip.description) {
      updateParams.description = dto.description?.trim();
      changedFields.push('description');
    }
    
    if (dto.startDate !== undefined) {
      const newStartDate = new Date(dto.startDate);
      if (newStartDate.getTime() !== trip.startDate.getTime()) {
        updateParams.startDate = newStartDate;
        changedFields.push('startDate');
      }
    }
    
    if (dto.endDate !== undefined) {
      const newEndDate = new Date(dto.endDate);
      if (newEndDate.getTime() !== trip.endDate.getTime()) {
        updateParams.endDate = newEndDate;
        changedFields.push('endDate');
      }
    }
    
    if (dto.estimatedBudget !== undefined && dto.estimatedBudget !== trip.estimatedBudget) {
      updateParams.estimatedBudget = dto.estimatedBudget;
      changedFields.push('estimatedBudget');
    }
    
    if (dto.baseCurrency !== undefined && dto.baseCurrency !== trip.baseCurrency) {
      updateParams.baseCurrency = dto.baseCurrency;
      changedFields.push('baseCurrency');
    }
    
    if (dto.category !== undefined && dto.category !== trip.category) {
      updateParams.category = dto.category;
      changedFields.push('category');
    }
    
    if (dto.image !== undefined && dto.image !== trip.image) {
      updateParams.image = dto.image;
      changedFields.push('image');
    }

    // Si no hay cambios, retornar el viaje actual
    if (changedFields.length === 0) {
      const memberCount = await this.tripService.getTripMemberCount(tripId);
      const member = await this.tripMemberRepository.findByTripAndUser(tripId, userId);
      const userRole = member?.roleLabel;
      
      return TripDTOMapper.toResponseDTO(trip, memberCount, userRole);
    }

    // Actualizar el viaje
    trip.update(updateParams);

    // Recalcular progreso si es necesario
    if (changedFields.some(field => ['title', 'destination', 'description', 'estimatedBudget'].includes(field))) {
      const newProgress = this.tripService.calculateTripProgress(trip);
      trip.updatePlanningProgress(newProgress);
    }

    // Guardar cambios
    await this.tripRepository.update(trip);

    // Emitir evento
    const event = TripEvents.createTripUpdatedEvent(trip, userId, previousData, changedFields);
    await this.eventBus.publish(event);

    // Obtener información adicional para la respuesta
    const memberCount = await this.tripService.getTripMemberCount(tripId);
    const member = await this.tripMemberRepository.findByTripAndUser(tripId, userId);
    const userRole = member?.roleLabel;

    return TripDTOMapper.toResponseDTO(trip, memberCount, userRole);
  }
}