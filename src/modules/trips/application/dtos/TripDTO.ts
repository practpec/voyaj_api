// src/modules/trips/application/dtos/TripDTO.ts
import { TripStatus, TripCategory } from '../../domain/Trip';

// DTOs de entrada
export interface CreateTripDTO {
  title: string;
  destination: string;
  description?: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  estimatedBudget?: number;
  baseCurrency?: string;
  isGroupTrip?: boolean;
  category?: string;
  image?: string;
}

export interface UpdateTripDTO {
  title?: string;
  destination?: string;
  description?: string;
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  estimatedBudget?: number;
  baseCurrency?: string;
  category?: string;
  image?: string;
}

export interface UpdateTripStatusDTO {
  status: TripStatus;
  reason?: string;
}

export interface TripFiltersDTO {
  status?: TripStatus;
  category?: TripCategory;
  isGroupTrip?: boolean;
  destination?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// DTOs de salida
export interface TripResponseDTO {
  id: string;
  userId: string;
  title: string;
  destination: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  estimatedBudget?: number;
  actualExpense: number;
  baseCurrency: string;
  isActive: boolean;
  isGroupTrip: boolean;
  category: TripCategory;
  image?: string;
  planningProgress: number;
  status: TripStatus;
  duration: number;
  budgetRemaining: number;
  budgetUsedPercentage: number;
  memberCount?: number;
  userRole?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripListResponseDTO {
  trips: TripResponseDTO[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface TripStatsDTO {
  totalTrips: number;
  activeTrips: number;
  completedTrips: number;
  totalExpenses: number;
  averageTripDuration: number;
  upcomingTrips: number;
  groupTrips: number;
  individualTrips: number;
}

// Mapper para conversión
export class TripDTOMapper {
  public static toResponseDTO(trip: any, memberCount?: number, userRole?: string): TripResponseDTO {
    return {
      id: trip.id,
      userId: trip.userId,
      title: trip.title,
      destination: trip.destination,
      description: trip.description,
      startDate: trip.startDate,
      endDate: trip.endDate,
      estimatedBudget: trip.estimatedBudget,
      actualExpense: trip.actualExpense,
      baseCurrency: trip.baseCurrency,
      isActive: trip.isActive,
      isGroupTrip: trip.isGroupTrip,
      category: trip.category,
      image: trip.image,
      planningProgress: trip.planningProgress,
      status: trip.status,
      duration: trip.getTripDuration ? trip.getTripDuration() : trip.duration,
      budgetRemaining: trip.budgetRemaining,
      budgetUsedPercentage: trip.budgetUsedPercentage,
      memberCount,
      userRole,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt
    };
  }

  public static toListResponseDTO(
    trips: TripResponseDTO[], 
    total: number, 
    page: number, 
    limit: number
  ): TripListResponseDTO {
    return {
      trips,
      total,
      page,
      limit,
      hasMore: (page * limit) < total
    };
  }

  public static validateCreateDTO(dto: CreateTripDTO): string[] {
    const errors: string[] = [];

    if (!dto.title?.trim()) {
      errors.push('El título es requerido');
    }

    if (!dto.destination?.trim()) {
      errors.push('El destino es requerido');
    }

    if (!dto.startDate) {
      errors.push('La fecha de inicio es requerida');
    }

    if (!dto.endDate) {
      errors.push('La fecha de fin es requerida');
    }

    if (dto.startDate && dto.endDate) {
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);
      
      if (startDate >= endDate) {
        errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
      }
      
      if (startDate < new Date()) {
        errors.push('La fecha de inicio no puede ser en el pasado');
      }
    }

    if (dto.estimatedBudget !== undefined && dto.estimatedBudget < 0) {
      errors.push('El presupuesto estimado no puede ser negativo');
    }

    if (dto.title && dto.title.length > 100) {
      errors.push('El título no puede exceder 100 caracteres');
    }

    if (dto.description && dto.description.length > 1000) {
      errors.push('La descripción no puede exceder 1000 caracteres');
    }

    return errors;
  }

  public static validateUpdateDTO(dto: UpdateTripDTO): string[] {
    const errors: string[] = [];

    if (dto.title !== undefined && !dto.title.trim()) {
      errors.push('El título no puede estar vacío');
    }

    if (dto.destination !== undefined && !dto.destination.trim()) {
      errors.push('El destino no puede estar vacío');
    }

    if (dto.startDate && dto.endDate) {
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);
      
      if (startDate >= endDate) {
        errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
      }
    }

    if (dto.estimatedBudget !== undefined && dto.estimatedBudget < 0) {
      errors.push('El presupuesto estimado no puede ser negativo');
    }

    if (dto.title && dto.title.length > 100) {
      errors.push('El título no puede exceder 100 caracteres');
    }

    if (dto.description && dto.description.length > 1000) {
      errors.push('La descripción no puede exceder 1000 caracteres');
    }

    return errors;
  }
}