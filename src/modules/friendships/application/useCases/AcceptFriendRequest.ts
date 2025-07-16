// src/modules/friendships/application/useCases/AcceptFriendRequest.ts
import { IFriendshipRepository } from '../../domain/interfaces/IFriendshipRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { FriendshipService } from '../../domain/FriendshipService';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { FriendRequestAcceptedEvent } from '../../domain/FriendshipEvents';
import { FriendshipResponseDTO, FriendshipDTOMapper } from '../dtos/FriendshipDTO';

export class AcceptFriendRequestUseCase {
  private logger: LoggerService;

  constructor(
    private friendshipRepository: IFriendshipRepository,
    private userRepository: IUserRepository,
    private friendshipService: FriendshipService,
    private eventBus: EventBus,
    logger: LoggerService
  ) {
    this.logger = logger;
  }

  public async execute(
    friendshipId: string, 
    userId: string
  ): Promise<FriendshipResponseDTO> {
    // Buscar la solicitud de amistad
    const friendship = await this.friendshipRepository.findById(friendshipId);
    if (!friendship) {
      throw ErrorHandler.createNotFoundError('Solicitud de amistad no encontrada');
    }

    // Validar que el usuario puede aceptar esta solicitud
    await this.friendshipService.validateFriendshipAction(friendship, userId, 'accept');

    try {
      // Aceptar la solicitud
      friendship.accept();
      
      // Guardar cambios
      await this.friendshipRepository.update(friendship);

      // Emitir evento de dominio
      const event = new FriendRequestAcceptedEvent(
        friendship.getUserId(),
        friendship.getFriendId(),
        friendship.getId()
      );
      await this.eventBus.publish(event);

      this.logger.info(`Solicitud de amistad aceptada: ${friendshipId}`, {
        friendshipId: friendship.getId(),
        requesterId: friendship.getUserId(),
        recipientId: friendship.getFriendId()
      });

      // Obtener información de ambos usuarios para la respuesta
      const [requesterUser, recipientUser] = await Promise.all([
        this.userRepository.findById(friendship.getUserId()),
        this.userRepository.findById(friendship.getFriendId())
      ]);

      return FriendshipDTOMapper.toFriendshipResponse(
        friendship.toPublicData(),
        requesterUser?.toPublicData(),
        recipientUser?.toPublicData()
      );

    } catch (error) {
      this.logger.error(`Error aceptando solicitud de amistad ${friendshipId}:`, error);
      throw ErrorHandler.createInternalServerError('Error aceptando solicitud de amistad');
    }
  }
}