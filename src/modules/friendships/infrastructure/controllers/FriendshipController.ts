// src/modules/friendships/infrastructure/controllers/FriendshipController.ts
import { Request, Response } from 'express';
import { ResponseUtils } from '../../../../shared/utils/ResponseUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ValidationUtils } from '../../../../shared/utils/ValidationUtils';

// Use Cases
import { SendFriendRequestUseCase } from '../../application/useCases/SendFriendRequest';
import { AcceptFriendRequestUseCase } from '../../application/useCases/AcceptFriendRequest';
import { RejectFriendRequestUseCase } from '../../application/useCases/RejectFriendRequest';
import { GetUserFriendsUseCase } from '../../application/useCases/GetUserFriends';
import { GetFriendRequestsUseCase } from '../../application/useCases/GetFriendRequests';
import { RemoveFriendshipUseCase } from '../../application/useCases/RemoveFriendship';
import { GetFriendSuggestionsUseCase } from '../../application/useCases/GetFriendSuggestions';

// Services & Repositories
import { FriendshipMongoRepository } from '../repositories/FriendshipMongoRepository';
import { UserMongoRepository } from '../../../users/infrastructure/repositories/UserMongoRepository';
import { FriendshipService } from '../../domain/FriendshipService';
import { EventBus } from '../../../../shared/events/EventBus';

export class FriendshipController {
  private logger: LoggerService;
  private friendshipRepository: FriendshipMongoRepository;
  private userRepository: UserMongoRepository;
  private friendshipService: FriendshipService;
  private eventBus: EventBus;

  // Use Cases
  private sendFriendRequestUseCase: SendFriendRequestUseCase;
  private acceptFriendRequestUseCase: AcceptFriendRequestUseCase;
  private rejectFriendRequestUseCase: RejectFriendRequestUseCase;
  private getUserFriendsUseCase: GetUserFriendsUseCase;
  private getFriendRequestsUseCase: GetFriendRequestsUseCase;
  private removeFriendshipUseCase: RemoveFriendshipUseCase;
  private getFriendSuggestionsUseCase: GetFriendSuggestionsUseCase;

  constructor() {
    this.logger = LoggerService.getInstance();
    this.friendshipRepository = new FriendshipMongoRepository();
    this.userRepository = new UserMongoRepository();
    this.friendshipService = new FriendshipService(this.friendshipRepository);
    this.eventBus = EventBus.getInstance();

    // Inicializar use cases
    this.sendFriendRequestUseCase = new SendFriendRequestUseCase(
      this.friendshipRepository,
      this.userRepository,
      this.friendshipService,
      this.eventBus,
      this.logger
    );

    this.acceptFriendRequestUseCase = new AcceptFriendRequestUseCase(
      this.friendshipRepository,
      this.userRepository,
      this.friendshipService,
      this.eventBus,
      this.logger
    );

    this.rejectFriendRequestUseCase = new RejectFriendRequestUseCase(
      this.friendshipRepository,
      this.friendshipService,
      this.eventBus,
      this.logger
    );

    this.getUserFriendsUseCase = new GetUserFriendsUseCase(
      this.friendshipRepository,
      this.userRepository,
      this.friendshipService,
      this.logger
    );

    this.getFriendRequestsUseCase = new GetFriendRequestsUseCase(
      this.friendshipRepository,
      this.userRepository,
      this.friendshipService,
      this.logger
    );

    this.removeFriendshipUseCase = new RemoveFriendshipUseCase(
      this.friendshipRepository,
      this.friendshipService,
      this.eventBus,
      this.logger
    );

    this.getFriendSuggestionsUseCase = new GetFriendSuggestionsUseCase(
      this.friendshipRepository,
      this.userRepository,
      this.friendshipService,
      this.logger
    );
  }

  // POST /api/friendships/request
  public sendFriendRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { friendId } = req.body;

      // Validar datos de entrada
      if (!ValidationUtils.validateUUID(friendId)) {
        throw ErrorHandler.createValidationError('ID de usuario inválido');
      }

      const result = await this.sendFriendRequestUseCase.execute(userId, { friendId });
      ResponseUtils.success(res, result, 'Solicitud de amistad enviada exitosamente');
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

  // POST /api/friendships/:id/accept
  public acceptFriendRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      if (!id || !ValidationUtils.validateUUID(id)) {
        throw ErrorHandler.createValidationError('ID de solicitud inválido');
      }

      const result = await this.acceptFriendRequestUseCase.execute(id, userId);
      ResponseUtils.success(res, result, 'Solicitud de amistad aceptada exitosamente');
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

  // POST /api/friendships/:id/reject
  public rejectFriendRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      if (!id || !ValidationUtils.validateUUID(id)) {
        throw ErrorHandler.createValidationError('ID de solicitud inválido');
      }

      await this.rejectFriendRequestUseCase.execute(id, userId);
      ResponseUtils.success(res, null, 'Solicitud de amistad rechazada exitosamente');
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

  // GET /api/friendships
  public getUserFriends = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      
      const friends = await this.getUserFriendsUseCase.execute(userId);
      ResponseUtils.success(res, friends, 'Lista de amigos obtenida exitosamente');
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

  // GET /api/friendships/requests/received
  // GET /api/friendships/requests/sent
  public getFriendRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const type = req.path.includes('received') ? 'received' : 'sent';
      
      const requests = await this.getFriendRequestsUseCase.execute(userId, type);
      const message = type === 'received' 
        ? 'Solicitudes recibidas obtenidas exitosamente'
        : 'Solicitudes enviadas obtenidas exitosamente';
      
      ResponseUtils.success(res, requests, message);
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

  // DELETE /api/friendships/:id
  public removeFriendship = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      if (!id || !ValidationUtils.validateUUID(id)) {
        throw ErrorHandler.createValidationError('ID de amistad inválido');
      }

      await this.removeFriendshipUseCase.execute(id, userId);
      ResponseUtils.success(res, null, 'Amistad eliminada exitosamente');
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

  // GET /api/friendships/suggestions
  public getFriendSuggestions = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 10;

      if (limit > 50) {
        throw ErrorHandler.createValidationError('El límite máximo es 50 sugerencias');
      }

      const suggestions = await this.getFriendSuggestionsUseCase.execute(userId, limit);
      ResponseUtils.success(res, suggestions, 'Sugerencias de amigos obtenidas exitosamente');
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

  // GET /api/friendships/stats
  public getFriendshipStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;

      // Obtener estadísticas básicas
      const [totalFriends, pendingReceived, pendingSent] = await Promise.all([
        this.friendshipRepository.countFriendsByUserId(userId),
        this.friendshipRepository.findPendingRequestsByRecipient(userId),
        this.friendshipRepository.findPendingRequestsBySender(userId)
      ]);

      const stats = {
        totalFriends,
        pendingRequestsSent: pendingSent.length,
        pendingRequestsReceived: pendingReceived.length
      };

      ResponseUtils.success(res, stats, 'Estadísticas de amistad obtenidas exitosamente');
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
}