// src/modules/friendships/application/useCases/SendFriendRequest.ts
import { Friendship } from '../../domain/Friendship';
import { FriendshipService } from '../../domain/FriendshipService';
import { IFriendshipRepository } from '../../domain/interfaces/IFriendshipRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { FriendRequestSentEvent } from '../../domain/FriendshipEvents';
import { SendFriendRequestDTO, FriendshipResponseDTO, FriendshipDTOMapper } from '../dtos/FriendshipDTO';

export class SendFriendRequestUseCase {
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
    requesterId: string, 
    dto: SendFriendRequestDTO
  ): Promise<FriendshipResponseDTO> {
    const { friendId } = dto;

    // Validar que el usuario destinatario existe
    const friendUser = await this.userRepository.findById(friendId);
    if (!friendUser) {
      throw ErrorHandler.createUserNotFoundError();
    }

    if (friendUser.isDeleted) {
      throw ErrorHandler.createUserDeletedError();
    }

    // Validar que se puede enviar la solicitud
    const canSendRequest = await this.friendshipService.canSendFriendRequest(requesterId, friendId);
    if (!canSendRequest) {
      throw ErrorHandler.createConflictError(
        'Ya existe una relación de amistad o solicitud pendiente entre estos usuarios'
      );
    }

    try {
      // Crear la nueva solicitud de amistad
      const friendship = Friendship.create(requesterId, friendId);
      
      // Guardar en el repositorio
      await this.friendshipRepository.create(friendship);

      // Emitir evento de dominio
      const event = new FriendRequestSentEvent(requesterId, friendId, friendship.getId());
      await this.eventBus.publish(event);

      this.logger.info(`Solicitud de amistad enviada: ${requesterId} -> ${friendId}`, {
        friendshipId: friendship.getId(),
        requesterId,
        friendId
      });

      // Obtener información del usuario solicitante para la respuesta
      const requesterUser = await this.userRepository.findById(requesterId);
      
      return FriendshipDTOMapper.toFriendshipResponse(
        friendship.toPublicData(),
        requesterUser?.toPublicData(),
        friendUser.toPublicData()
      );

    } catch (error) {
      this.logger.error(`Error enviando solicitud de amistad: ${requesterId} -> ${friendId}:`, error);
      throw ErrorHandler.createInternalServerError('Error enviando solicitud de amistad');
    }
  }
}