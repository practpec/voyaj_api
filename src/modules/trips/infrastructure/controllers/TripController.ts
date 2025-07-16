// src/modules/trips/infrastructure/controllers/TripController.ts
import { Request, Response } from 'express';
import { ResponseUtils } from '../../../../shared/utils/ResponseUtils';
import { ErrorHandler, ValidationError } from '../../../../shared/utils/ErrorUtils';
import { ValidationUtils } from '../../../../shared/utils/ValidationUtils';

// Use Cases
import { CreateTripUseCase } from '../../application/useCases/CreateTrip';
import { GetTripUseCase } from '../../application/useCases/GetTrip';
import { GetUserTripsUseCase } from '../../application/useCases/GetUserTrips';
import { UpdateTripUseCase } from '../../application/useCases/UpdateTrip';
import { DeleteTripUseCase } from '../../application/useCases/DeleteTrip';
import { UpdateTripStatusUseCase } from '../../application/useCases/UpdateTripStatus';
import { InviteUserToTripUseCase } from '../../application/useCases/InviteUserToTrip';
import { HandleTripInvitationUseCase } from '../../application/useCases/HandleTripInvitation';
import { UpdateMemberRoleUseCase } from '../../application/useCases/UpdateMemberRole';
import { RemoveTripMemberUseCase } from '../../application/useCases/RemoveTripMember';
import { LeaveTripUseCase } from '../../application/useCases/LeaveTrip';
import { GetTripMembersUseCase } from '../../application/useCases/GetTripMembers';
import { ExportTripUseCase } from '../../application/useCases/ExportTrip';

// Services & Repositories
import { TripMongoRepository } from '../repositories/TripMongoRepository';
import { TripMemberMongoRepository } from '../repositories/TripMemberMongoRepository';
import { UserMongoRepository } from '../../../users/infrastructure/repositories/UserMongoRepository';
import { TripService } from '../../domain/TripService';
import { TripExportService } from '../services/TripExportService';
import { EventBus } from '../../../../shared/events/EventBus';

export class TripController {
  private tripRepository: TripMongoRepository;
  private tripMemberRepository: TripMemberMongoRepository;
  private userRepository: UserMongoRepository;
  private tripService: TripService;
  private tripExportService: TripExportService;
  private eventBus: EventBus;

  // Use Cases
  private createTripUseCase: CreateTripUseCase;
  private getTripUseCase: GetTripUseCase;
  private getUserTripsUseCase: GetUserTripsUseCase;
  private updateTripUseCase: UpdateTripUseCase;
  private deleteTripUseCase: DeleteTripUseCase;
  private updateTripStatusUseCase: UpdateTripStatusUseCase;
  private inviteUserToTripUseCase: InviteUserToTripUseCase;
  private handleTripInvitationUseCase: HandleTripInvitationUseCase;
  private updateMemberRoleUseCase: UpdateMemberRoleUseCase;
  private removeTripMemberUseCase: RemoveTripMemberUseCase;
  private leaveTripUseCase: LeaveTripUseCase;
  private getTripMembersUseCase: GetTripMembersUseCase;
  private exportTripUseCase: ExportTripUseCase;

  constructor() {
    this.initializeRepositories();
    this.initializeServices();
    this.initializeUseCases();
  }

  private initializeRepositories(): void {
    this.tripRepository = new TripMongoRepository();
    this.tripMemberRepository = new TripMemberMongoRepository();
    this.userRepository = new UserMongoRepository();
  }

  private initializeServices(): void {
    this.tripService = new TripService(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository
    );
    this.tripExportService = new TripExportService();
    this.eventBus = EventBus.getInstance();
  }

  private initializeUseCases(): void {
    this.createTripUseCase = new CreateTripUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository,
      this.tripService,
      this.eventBus
    );

    this.getTripUseCase = new GetTripUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.tripService
    );

    this.getUserTripsUseCase = new GetUserTripsUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.tripService
    );

    this.updateTripUseCase = new UpdateTripUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.tripService,
      this.eventBus
    );

    this.deleteTripUseCase = new DeleteTripUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.tripService,
      this.eventBus
    );

    this.updateTripStatusUseCase = new UpdateTripStatusUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.tripService,
      this.eventBus
    );

    this.inviteUserToTripUseCase = new InviteUserToTripUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository,
      this.tripService,
      this.eventBus
    );

    this.handleTripInvitationUseCase = new HandleTripInvitationUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository,
      this.eventBus
    );

    this.updateMemberRoleUseCase = new UpdateMemberRoleUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository,
      this.tripService,
      this.eventBus
    );

    this.removeTripMemberUseCase = new RemoveTripMemberUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository,
      this.tripService,
      this.eventBus
    );

    this.leaveTripUseCase = new LeaveTripUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository,
      this.eventBus
    );

    this.getTripMembersUseCase = new GetTripMembersUseCase(
      this.tripMemberRepository,
      this.userRepository,
      this.tripService
    );

    this.exportTripUseCase = new ExportTripUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository,
      this.tripService,
      this.tripExportService
    );
  }

  // GET /api/trips
  public getUserTrips = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;

      const filters = {
        status: req.query.status as string,
        category: req.query.category as string,
        isGroupTrip: req.query.isGroupTrip === 'true' ? true : req.query.isGroupTrip === 'false' ? false : undefined,
        destination: req.query.destination as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      const result = await this.getUserTripsUseCase.execute(userId, filters);
      ResponseUtils.success(res, result);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // POST /api/trips
  public createTrip = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const result = await this.createTripUseCase.execute(userId, req.body);
      ResponseUtils.created(res, result, 'Viaje creado exitosamente');
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // GET// src/modules/trips/infrastructure/controllers/TripController.ts
import { Request, Response } from 'express';
import { ResponseUtils } from '../../../../shared/utils/ResponseUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { ValidationUtils } from '../../../../shared/utils/ValidationUtils';

// Use Cases
import { CreateTripUseCase } from '../../application/useCases/CreateTrip';
import { GetTripUseCase } from '../../application/useCases/GetTrip';
import { GetUserTripsUseCase } from '../../application/useCases/GetUserTrips';
import { UpdateTripUseCase } from '../../application/useCases/UpdateTrip';
import { DeleteTripUseCase } from '../../application/useCases/DeleteTrip';
import { UpdateTripStatusUseCase } from '../../application/useCases/UpdateTripStatus';
import { InviteUserToTripUseCase } from '../../application/useCases/InviteUserToTrip';
import { HandleTripInvitationUseCase } from '../../application/useCases/HandleTripInvitation';
import { UpdateMemberRoleUseCase } from '../../application/useCases/UpdateMemberRole';
import { RemoveTripMemberUseCase } from '../../application/useCases/RemoveTripMember';
import { LeaveTripUseCase } from '../../application/useCases/LeaveTrip';
import { GetTripMembersUseCase } from '../../application/useCases/GetTripMembers';
import { ExportTripUseCase } from '../../application/useCases/ExportTrip';

// Services & Repositories
import { TripMongoRepository } from '../repositories/TripMongoRepository';
import { TripMemberMongoRepository } from '../repositories/TripMemberMongoRepository';
import { UserMongoRepository } from '../../../users/infrastructure/repositories/UserMongoRepository';
import { TripService } from '../../domain/TripService';
import { TripExportService } from '../services/TripExportService';
import { EventBus } from '../../../../shared/events/EventBus';

export class TripController {
  private tripRepository: TripMongoRepository;
  private tripMemberRepository: TripMemberMongoRepository;
  private userRepository: UserMongoRepository;
  private tripService: TripService;
  private tripExportService: TripExportService;
  private eventBus: EventBus;

  // Use Cases
  private createTripUseCase: CreateTripUseCase;
  private getTripUseCase: GetTripUseCase;
  private getUserTripsUseCase: GetUserTripsUseCase;
  private updateTripUseCase: UpdateTripUseCase;
  private deleteTripUseCase: DeleteTripUseCase;
  private updateTripStatusUseCase: UpdateTripStatusUseCase;
  private inviteUserToTripUseCase: InviteUserToTripUseCase;
  private handleTripInvitationUseCase: HandleTripInvitationUseCase;
  private updateMemberRoleUseCase: UpdateMemberRoleUseCase;
  private removeTripMemberUseCase: RemoveTripMemberUseCase;
  private leaveTripUseCase: LeaveTripUseCase;
  private getTripMembersUseCase: GetTripMembersUseCase;
  private exportTripUseCase: ExportTripUseCase;

  constructor() {
    this.initializeRepositories();
    this.initializeServices();
    this.initializeUseCases();
  }

  private initializeRepositories(): void {
    this.tripRepository = new TripMongoRepository();
    this.tripMemberRepository = new TripMemberMongoRepository();
    this.userRepository = new UserMongoRepository();
  }

  private initializeServices(): void {
    this.tripService = new TripService(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository
    );
    this.tripExportService = new TripExportService();
    this.eventBus = EventBus.getInstance();
  }

  private initializeUseCases(): void {
    this.createTripUseCase = new CreateTripUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository,
      this.tripService,
      this.eventBus
    );

    this.getTripUseCase = new GetTripUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.tripService
    );

    this.getUserTripsUseCase = new GetUserTripsUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.tripService
    );

    this.updateTripUseCase = new UpdateTripUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.tripService,
      this.eventBus
    );

    this.deleteTripUseCase = new DeleteTripUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.tripService,
      this.eventBus
    );

    this.updateTripStatusUseCase = new UpdateTripStatusUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.tripService,
      this.eventBus
    );

    this.inviteUserToTripUseCase = new InviteUserToTripUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository,
      this.tripService,
      this.eventBus
    );

    this.handleTripInvitationUseCase = new HandleTripInvitationUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository,
      this.eventBus
    );

    this.updateMemberRoleUseCase = new UpdateMemberRoleUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository,
      this.tripService,
      this.eventBus
    );

    this.removeTripMemberUseCase = new RemoveTripMemberUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository,
      this.tripService,
      this.eventBus
    );

    this.leaveTripUseCase = new LeaveTripUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository,
      this.eventBus
    );

    this.getTripMembersUseCase = new GetTripMembersUseCase(
      this.tripMemberRepository,
      this.userRepository,
      this.tripService
    );

    this.exportTripUseCase = new ExportTripUseCase(
      this.tripRepository,
      this.tripMemberRepository,
      this.userRepository,
      this.tripService,
      this.tripExportService
    );
  }

  // GET /api/trips
  public async getUserTrips(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtils.unauthorized(res, 'Usuario no autenticado');
        return;
      }

      const filters = {
        status: req.query.status as string,
        category: req.query.category as string,
        isGroupTrip: req.query.isGroupTrip === 'true' ? true : req.query.isGroupTrip === 'false' ? false : undefined,
        destination: req.query.destination as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      const result = await this.getUserTripsUseCase.execute(userId, filters);
      ResponseUtils.success(res, result);
    } catch (error) {
      ErrorHandler.handleControllerError(res, error);
    }
  }

  // POST /api/trips
  public async createTrip(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseUtils.unauthorized(res, 'Usuario no autenticado');
        return;
      }

      const result = await this.createTripUseCase.execute(userId, req.body);
      ResponseUtils.created(res, result, 'Viaje creado exitosamente');
    } catch (error) {
      ErrorHandler.handleControllerError(res, error);
    }
  }

  // GET /api/trips/:id
  public async getTripById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const tripId = req.params.id;

      if (!userId) {
        ResponseUtils.unauthorized(res, 'Usuario no autenticado');
        return;
      }

      if (!ValidationUtils.isValidObjectId(tripId)) {
        ResponseUtils.badRequest(res, 'ID de viaje inválido');
        return;
      }

      const result = await this.getTripUseCase.execute(tripId, userId);
      ResponseUtils.success(res, result);
    } catch (error) {
      ErrorHandler.handleControllerError(res, error);
    }
  }

  // PUT /api/trips/:id
  public async updateTrip(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const tripId = req.params.id;

      if (!userId) {
        ResponseUtils.unauthorized(res, 'Usuario no autenticado');
        return;
      }

      if (!ValidationUtils.isValidObjectId(tripId)) {
        ResponseUtils.badRequest(res, 'ID de viaje inválido');
        return;
      }

      const result = await this.updateTripUseCase.execute(tripId, userId, req.body);
      ResponseUtils.success(res, result, 'Viaje actualizado exitosamente');
    } catch (error) {
      ErrorHandler.handleControllerError(res, error);
    }
  }

  // DELETE /api/trips/:id
  public async deleteTrip(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const tripId = req.params.id;

      if (!userId) {
        ResponseUtils.unauthorized(res, 'Usuario no autenticado');
        return;
      }

      if (!ValidationUtils.isValidObjectId(tripId)) {
        ResponseUtils.badRequest(res, 'ID de viaje inválido');
        return;
      }

      const result = await this.deleteTripUseCase.execute(tripId, userId);
      ResponseUtils.success(res, result);
    } catch (error) {
      ErrorHandler.handleControllerError(res, error);
    }
  }

  // PUT /api/trips/:id/status
  public async updateTripStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const tripId = req.params.id;

      if (!userId) {
        ResponseUtils.unauthorized(res, 'Usuario no autenticado');
        return;
      }

      if (!ValidationUtils.isValidObjectId(tripId)) {
        ResponseUtils.badRequest(res, 'ID de viaje inválido');
        return;
      }

      const result = await this.updateTripStatusUseCase.execute(tripId, userId, req.body);
      ResponseUtils.success(res, result, 'Estado del viaje actualizado exitosamente');
    } catch (error) {
      ErrorHandler.handleControllerError(res, error);
    }
  }

  // GET /api/trips/:id/members
  public async getTripMembers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const tripId = req.params.id;

      if (!userId) {
        ResponseUtils.unauthorized(res, 'Usuario no autenticado');
        return;
      }

      if (!ValidationUtils.isValidObjectId(tripId)) {
        ResponseUtils.badRequest(res, 'ID de viaje inválido');
        return;
      }

      const filters = {
        role: req.query.role as string,
        status: req.query.status as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      const result = await this.getTripMembersUseCase.execute(tripId, userId, filters);
      ResponseUtils.success(res, result);
    } catch (error) {
      ErrorHandler.handleControllerError(res, error);
    }
  }

  // POST /api/trips/:id/invite
  public async inviteUserToTrip(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const tripId = req.params.id;

      if (!userId) {
        ResponseUtils.unauthorized(res, 'Usuario no autenticado');
        return;
      }

      if (!ValidationUtils.isValidObjectId(tripId)) {
        ResponseUtils.badRequest(res, 'ID de viaje inválido');
        return;
      }

      const result = await this.inviteUserToTripUseCase.execute(tripId, userId, req.body);
      ResponseUtils.created(res, result, 'Usuario invitado exitosamente');
    } catch (error) {
      ErrorHandler.handleControllerError(res, error);
    }
  }

  // POST /api/trips/:id/invitation-response
  public async handleTripInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const tripId = req.params.id;

      if (!userId) {
        ResponseUtils.unauthorized(res, 'Usuario no autenticado');
        return;
      }

      if (!ValidationUtils.isValidObjectId(tripId)) {
        ResponseUtils.badRequest(res, 'ID de viaje inválido');
        return;
      }

      const result = await this.handleTripInvitationUseCase.execute(tripId, userId, req.body);
      ResponseUtils.success(res, result, 'Respuesta a invitación procesada exitosamente');
    } catch (error) {
      ErrorHandler.handleControllerError(res, error);
    }
  }

  // PUT /api/trips/:id/members/:userId/role
  public async updateMemberRole(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const tripId = req.params.id;
      const targetUserId = req.params.userId;

      if (!userId) {
        ResponseUtils.unauthorized(res, 'Usuario no autenticado');
        return;
      }

      if (!ValidationUtils.isValidObjectId(tripId) || !ValidationUtils.isValidObjectId(targetUserId)) {
        ResponseUtils.badRequest(res, 'ID inválido');
        return;
      }

      const result = await this.updateMemberRoleUseCase.execute(tripId, userId, targetUserId, req.body);
      ResponseUtils.success(res, result, 'Rol de miembro actualizado exitosamente');
    } catch (error) {
      ErrorHandler.handleControllerError(res, error);
    }
  }

  // DELETE /api/trips/:id/members/:userId
  public async removeTripMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const tripId = req.params.id;
      const targetUserId = req.params.userId;

      if (!userId) {
        ResponseUtils.unauthorized(res, 'Usuario no autenticado');
        return;
      }

      if (!ValidationUtils.isValidObjectId(tripId) || !ValidationUtils.isValidObjectId(targetUserId)) {
        ResponseUtils.badRequest(res, 'ID inválido');
        return;
      }

      const result = await this.removeTripMemberUseCase.execute(tripId, userId, targetUserId, req.body.reason);
      ResponseUtils.success(res, result);
    } catch (error) {
      ErrorHandler.handleControllerError(res, error);
    }
  }

  // POST /api/trips/:id/leave
  public async leaveTrip(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const tripId = req.params.id;

      if (!userId) {
        ResponseUtils.unauthorized(res, 'Usuario no autenticado');
        return;
      }

      if (!ValidationUtils.isValidObjectId(tripId)) {
        ResponseUtils.badRequest(res, 'ID de viaje inválido');
        return;
      }

      const result = await this.leaveTripUseCase.execute(tripId, userId, req.body.reason);
      ResponseUtils.success(res, result);
    } catch (error) {
      ErrorHandler.handleControllerError(res, error);
    }
  }

  // GET /api/trips/:id/export
  public async exportTrip(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const tripId = req.params.id;

      if (!userId) {
        ResponseUtils.unauthorized(res, 'Usuario no autenticado');
        return;
      }

      if (!ValidationUtils.isValidObjectId(tripId)) {
        ResponseUtils.badRequest(res, 'ID de viaje inválido');
        return;
      }

      const exportOptions = {
        format: (req.query.format as 'pdf' | 'excel') || 'pdf',
        includeMembers: req.query.includeMembers !== 'false',
        includeActivities: req.query.includeActivities === 'true',
        includeExpenses: req.query.includeExpenses === 'true',
        includeDiary: req.query.includeDiary === 'true',
        includePhotos: req.query.includePhotos === 'true',
        dateRange: req.query.startDate && req.query.endDate ? {
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string
        } : undefined
      };

      const result = await this.exportTripUseCase.execute(tripId, userId, exportOptions);
      ResponseUtils.success(res, result, 'Exportación generada exitosamente');
    } catch (error) {
      ErrorHandler.handleControllerError(res, error);
    }
  }
}