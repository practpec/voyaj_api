// src/modules/friendships/application/useCases/RemoveFriendship.ts
import { IFriendshipRepository } from '../../domain/interfaces/IFriendshipRepository';
import { FriendshipService } from '../../domain/FriendshipService';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { FriendshipRemovedEvent } from '../../domain/FriendshipEvents';

export class RemoveFriendshipUseCase {
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
    // Buscar la amistad
    const friendship = await this.friendshipRepository.findById(friendshipId);
    if (!friendship) {
      throw ErrorHandler.createNotFoundError('Amistad no encontrada');
    }

    // Validar permisos para eliminar la amistad
    await this.friendshipService.validateRemovalPermission(friendship, userId);

    try {
      // Marcar la amistad como eliminada
      friendship.remove();
      
      // Guardar cambios
      await this.friendshipRepository.update(friendship);

      // Emitir evento de dominio
      const event = new FriendshipRemovedEvent(
        friendship.getUserId(),
        friendship.getFriendId(),
        friendship.getId()
      );
      await this.eventBus.publish(event);

      this.logger.info(`Amistad eliminada: ${friendshipId}`, {
        friendshipId: friendship.getId(),
        userId,
        friendId: friendship.getUserId() === userId ? friendship.getFriendId() : friendship.getUserId()
      });

    } catch (error) {
      this.logger.error(`Error eliminando amistad ${friendshipId}:`, error);
      throw new Error('Error eliminando amistad');
    }
  }
}