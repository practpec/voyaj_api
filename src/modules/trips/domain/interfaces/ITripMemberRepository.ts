// src/modules/trips/domain/interfaces/ITripMemberRepository.ts
import { TripMember, TripMemberRole, TripMemberStatus } from '../TripMember';

export interface ITripMemberFilters {
  tripId?: string;
  userId?: string;
  role?: TripMemberRole;
  status?: TripMemberStatus;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface ITripMemberRepository {
  // Operaciones básicas CRUD
  create(tripMember: TripMember): Promise<void>;
  findById(id: string): Promise<TripMember | null>;
  update(tripMember: TripMember): Promise<void>;
  delete(id: string): Promise<void>;

  // Consultas específicas por viaje
  findByTripId(tripId: string, filters?: ITripMemberFilters): Promise<TripMember[]>;
  findActiveMembersByTripId(tripId: string): Promise<TripMember[]>;
  findPendingMembersByTripId(tripId: string): Promise<TripMember[]>;
  findTripOwner(tripId: string): Promise<TripMember | null>;
  findTripAdmins(tripId: string): Promise<TripMember[]>;

  // Consultas específicas por usuario
  findByUserId(userId: string, filters?: ITripMemberFilters): Promise<TripMember[]>;
  findActiveByUserId(userId: string): Promise<TripMember[]>;
  findPendingInvitationsByUserId(userId: string): Promise<TripMember[]>;
  findUserTripsWithRole(userId: string, role: TripMemberRole): Promise<TripMember[]>;

  // Consultas combinadas
  findByTripAndUser(tripId: string, userId: string): Promise<TripMember | null>;
  findByTripAndRole(tripId: string, role: TripMemberRole): Promise<TripMember[]>;
  findByTripAndStatus(tripId: string, status: TripMemberStatus): Promise<TripMember[]>;

  // Validaciones
  existsByTripAndUser(tripId: string, userId: string): Promise<boolean>;
  isUserMemberOfTrip(tripId: string, userId: string): Promise<boolean>;
  isUserOwnerOfTrip(tripId: string, userId: string): Promise<boolean>;
  isUserAdminOfTrip(tripId: string, userId: string): Promise<boolean>;
  canUserAccessTrip(tripId: string, userId: string): Promise<boolean>;
  
  // Operaciones de conteo
  countMembersByTripId(tripId: string): Promise<number>;
  countActiveMembersByTripId(tripId: string): Promise<number>;
  countPendingMembersByTripId(tripId: string): Promise<number>;
  countTripsByUserId(userId: string): Promise<number>;

  // Operaciones de búsqueda
  search(query: string, tripId?: string): Promise<TripMember[]>;
  findWithFilters(filters: ITripMemberFilters): Promise<TripMember[]>;
  countByFilters(filters: ITripMemberFilters): Promise<number>;

  // Operaciones de limpieza
  deleteByTripId(tripId: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  cleanupRejectedInvitations(olderThanDays: number): Promise<number>;
}