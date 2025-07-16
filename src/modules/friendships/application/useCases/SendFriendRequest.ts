// src/modules/friendships/application/useCases/SendFriendRequest.ts
import { IFriendshipRepository } from '../../domain/interfaces/IFriendshipRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { FriendshipService } from '../../domain/FriendshipService';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { FriendshipEvents } from '../../domain/FriendshipEvents';
import { ValidationUtils } from '../../../../shared/utils/ValidationUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { SendFriendRequestDTO } from '../dtos/SendFriendRequestDTO';

export class SendFriendRequestUseCase {
  private friendshipService: FriendshipService;

  constructor(
    private friendshipRepository: IFriendshipRepository,
    private userRepository: IUserRepository,
    private eventBus: EventBus,
    private logger: LoggerService
  ) {
    this.friendshipService = new FriendshipService(
      friendshipRepository,
      userRepository,
      eventBus,
      logger
    );
  }

  public async execute(dto: SendFriendRequestDTO): Promise<void> {
    // Validar datos de entrada
    const validation = ValidationUtils.validate(
      ValidationUtils.sendFriendRequestSchema,
      dto
    );

    if (!validation.isValid) {
      throw ErrorHandler.createValidationError(validation.error!, validation.details);
    }

    try {
      // Crear la solicitud de amistad usando el servicio de dominio
      const friendship = await this.friendshipService.sendFriendRequest(
        dto.requesterId,
        dto.recipientId
      );

      // Publicar evento de solicitud enviada
      const event = FriendshipEvents.friendRequestSent({
        requesterId: dto.requesterId,
        recipientId: dto.recipientId,
        friendshipId: friendship.id!,
        sentAt: new Date()
      });

      await this.eventBus.publish(event);

      this.logger.info('Solicitud de amistad enviada exitosamente', {
        requesterId: dto.requesterId,
        recipientId: dto.recipientId,
        friendshipId: friendship.id
      });

    } catch (error) {
      this.logger.error('Error enviando solicitud de amistad:', {
        error,
        requesterId: dto.requesterId,
        recipientId: dto.recipientId
      });
      throw error;
    }
  }
}