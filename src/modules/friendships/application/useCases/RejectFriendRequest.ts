// src/modules/friendships/application/useCases/RejectFriendRequest.ts
import { IFriendshipRepository } from '../../domain/interfaces/IFriendshipRepository';
import { FriendshipService } from '../../domain/FriendshipService';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { FriendRequestRejectedEvent } from '../../domain/FriendshipEvents';

export class RejectFriendRequestUseCase {
  private logger: LoggerService;

  constructor(
    private friendshipRepository: IFriendshipRepository,
    private friendshipService: FriendshipService,
    private eventBus: EventBus,
    logger: LoggerService
  ) {
    this.logger = logger;
  }

  public async execute(friendshipId: string, userId: string): Promise<void> {
    // Buscar la solicitud de amistad
    const friendship = await this.friendshipRepository.findById(friendshipId);
    if (!friendship) {
      throw ErrorHandler.createNotFoundError('Solicitud de amistad no encontrada');
    }

    // Validar que el usuario puede rechazar esta solicitud
    await this.friendshipService.validateFriendshipAction(friendship, userId, 'reject');

    try {
      // Rechazar la solicitud
      friendship.reject();
      
      // Guardar cambios
      await this.friendshipRepository.update(friendship);

      // Emitir evento de dominio
      const event = new FriendRequestRejectedEvent(
        friendship.getUserId(),
        friendship.getFriendId(),
        friendship.getId()
      );
      await this.eventBus.publish(event);

      this.logger.info(`Solicitud de amistad rechazada: ${friendshipId}`, {
        friendshipId: friendship.getId(),
        requesterId: friendship.getUserId(),
        recipientId: friendship.getFriendId()
      });

    } catch (error) {
      this.logger.error(`Error rechazando solicitud de amistad ${friendshipId}:`, error);
      throw ErrorHandler.createInternalServerError('Error rechazando solicitud de amistad');
    }
  }
}