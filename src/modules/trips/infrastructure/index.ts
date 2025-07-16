// src/modules/trips/index.ts

// Domain exports
export { Trip, TripStatus, TripCategory } from './domain/Trip';
export { TripMember, TripMemberRole, TripMemberStatus } from './domain/TripMember';
export { TripService } from './domain/TripService';
export { 
  TripEvents, 
  TRIP_EVENT_TYPES,
  TripCreatedEvent,
  TripUpdatedEvent,
  TripDeletedEvent,
  TripStatusChangedEvent,
  TripCompletedEvent,
  TripCancelledEvent,
  MemberInvitedEvent,
  MemberJoinedEvent,
  MemberLeftEvent,
  MemberRemovedEvent,
  MemberRoleChangedEvent,
  InvitationSentEvent,
  InvitationAcceptedEvent,
  InvitationRejectedEvent,
  InvitationCancelledEvent
} from './domain/TripEvents';
export { ITripRepository } from './domain/interfaces/ITripRepository';
export { ITripMemberRepository } from './domain/interfaces/ITripMemberRepository';

// Application exports
export { CreateTripUseCase } from './application/useCases/CreateTrip';
export { GetTripUseCase } from './application/useCases/GetTrip';
export { GetUserTripsUseCase } from './application/useCases/GetUserTrips';
export { UpdateTripUseCase } from './application/useCases/UpdateTrip';
export { DeleteTripUseCase } from './application/useCases/DeleteTrip';
export { UpdateTripStatusUseCase } from './application/useCases/UpdateTripStatus';
export { InviteUserToTripUseCase } from './application/useCases/InviteUserToTrip';
export { HandleTripInvitationUseCase } from './application/useCases/HandleTripInvitation';
export { UpdateMemberRoleUseCase } from './application/useCases/UpdateMemberRole';
export { RemoveTripMemberUseCase } from './application/useCases/RemoveTripMember';
export { LeaveTripUseCase } from './application/useCases/LeaveTrip';
export { GetTripMembersUseCase } from './application/useCases/GetTripMembers';
export { ExportTripUseCase } from './application/useCases/ExportTrip';

// DTOs
export {
  CreateTripDTO,
  UpdateTripDTO,
  UpdateTripStatusDTO,
  TripFiltersDTO,
  TripResponseDTO,
  TripListResponseDTO,
  TripStatsDTO,
  TripDTOMapper
} from './application/dtos/TripDTO';

export {
  InviteMemberDTO,
  UpdateMemberRoleDTO,
  HandleInvitationDTO,
  UpdateMemberNotesDTO,
  TripMemberFiltersDTO,
  TripMemberResponseDTO,
  TripMemberListResponseDTO,
  TripMemberStatsDTO,
  TripMemberDTOMapper
} from './application/dtos/TripMemberDTO';

export {
  SendTripInvitationDTO,
  BulkInviteMembersDTO,
  ResendInvitationDTO,
  TripInvitationResponseDTO,
  PendingInvitationsResponseDTO,
  SentInvitationsResponseDTO,
  ExportTripDTO,
  ExportTripResponseDTO,
  TripInvitationDTOMapper
} from './application/dtos/TripInvitationDTO';

// Infrastructure exports
export { TripController } from './infrastructure/controllers/TripController';
export { TripMongoRepository } from './infrastructure/repositories/TripMongoRepository';
export { TripMemberMongoRepository } from './infrastructure/repositories/TripMemberMongoRepository';
export { TripExportService } from './infrastructure/services/TripExportService';
export { TripEventHandlers } from './infrastructure/events/TripEventHandlers';
export { tripRoutes } from './infrastructure/routes/tripRoutes';

// Module configuration
export class TripModule {
  public static async initialize(): Promise<void> {
    try {
      // Inicializar manejadores de eventos
      const eventBus = require('../../shared/events/EventBus').EventBus.getInstance();
      const emailService = require('../../shared/services/EmailService').EmailService.getInstance();
      const notificationService = require('../../shared/services/NotificationService').NotificationService.getInstance();
      const userRepository = new (require('../users/infrastructure/repositories/UserMongoRepository').UserMongoRepository)();
      
      new TripEventHandlers(eventBus, emailService, notificationService, userRepository);
      
      // Programar limpieza de archivos de exportación
      const exportService = new TripExportService();
      setInterval(async () => {
        await exportService.cleanupOldExports(24); // Limpiar archivos de más de 24 horas
      }, 6 * 60 * 60 * 1000); // Ejecutar cada 6 horas

      console.log('✅ Trip module initialized successfully');
    } catch (error) {
      console.error('❌ Error inicializando módulo de viajes:', error);
      throw error;
    }
  }
}