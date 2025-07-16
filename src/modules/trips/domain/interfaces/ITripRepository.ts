// src/modules/trips/domain/interfaces/ITripRepository.ts
import { Trip } from '../Trip';

export interface ITripFilters {
  userId?: string;
  status?: string;
  category?: string;
  isGroupTrip?: boolean;
  destination?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface ITripRepository {
  // Operaciones básicas CRUD
  create(trip: Trip): Promise<void>;
  findById(id: string): Promise<Trip | null>;
  update(trip: Trip): Promise<void>;
  delete(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;

  // Consultas específicas
  findByUserId(userId: string, filters?: ITripFilters): Promise<Trip[]>;
  findActiveByUserId(userId: string): Promise<Trip[]>;
  findByDestination(destination: string, userId?: string): Promise<Trip[]>;
  findByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<Trip[]>;
  findByCategory(category: string, userId?: string): Promise<Trip[]>;
  findGroupTrips(userId: string): Promise<Trip[]>;
  
  // Operaciones de búsqueda y filtrado
  search(query: string, userId?: string): Promise<Trip[]>;
  findWithFilters(filters: ITripFilters): Promise<Trip[]>;
  countByFilters(filters: ITripFilters): Promise<number>;
  
  // Validaciones
  existsById(id: string): Promise<boolean>;
  isOwner(tripId: string, userId: string): Promise<boolean>;
  
  // Operaciones de agregación
  getUserTripStats(userId: string): Promise<{
    totalTrips: number;
    completedTrips: number;
    activeTrips: number;
    totalExpenses: number;
    averageTripDuration: number;
  }>;
}