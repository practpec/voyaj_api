// src/modules/friendships/application/useCases/SendFriendRequest.ts
import { IFriendshipRepository } from '../../domain/interfaces/IFriendshipRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { FriendshipService } from '../../domain/FriendshipService';
import { Friendship } from '../../domain/Friendship';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { FriendshipEvents } from '../../domain/FriendshipEvents';
import { ValidationUtils } from '../../../../shared/utils/ValidationUtils';
import { ValidationError, NotFoundError, ConflictError } from '../../../../shared/utils/ErrorUtils';
import { SendFriendRequestDTO } from '../dtos/SendFriendRequestDTO';

export class SendFriendRequestUseCase {
  private friendshipService: FriendshipService;

  constructor(
    private friendshipRepository: IFriendshipRepository,
    private userRepository: IUserRepository,
    private eventBus: EventBus,
    private logger: LoggerService
  ) {
    this.friendshipService = new FriendshipService(friendshipRepository);
  }

  public async execute(dto: SendFriendRequestDTO): Promise<void> {
    // Validar datos de entrada
    if (!dto.requesterId || !dto.recipientId) {
      throw new ValidationError('requesterId y recipientId son requeridos');
    }

    if (dto.requesterId === dto.recipientId) {
      throw new ValidationError('No puedes enviarte una solicitud de amistad a ti mismo');
    }

    try {
      // Verificar si el usuario receptor existe
      const recipientUser = await this.userRepository.findById(dto.recipientId);
      if (!recipientUser) {
        throw new NotFoundError('Usuario destinatario no encontrado');
      }

      // Verificar si se puede enviar la solicitud
      const canSend = await this.friendshipService.canSendFriendRequest(dto.requesterId, dto.recipientId);
      if (!canSend) {
        throw new ConflictError('Ya existe una amistad o solicitud entre estos usuarios');
      }

      // Crear la solicitud de amistad
      const friendship = Friendship.create(dto.requesterId, dto.recipientId);
      await this.friendshipRepository.create(friendship);

      // Publicar evento de solicitud enviada
      const event = FriendshipEvents.friendRequestSent({
        requesterId: dto.requesterId,
        recipientId: dto.recipientId,
        friendshipId: friendship.getId(),
        sentAt: new Date()
      });

      await this.eventBus.publish(event);

      this.logger.info('Solicitud de amistad enviada exitosamente', {
        requesterId: dto.requesterId,
        recipientId: dto.recipientId,
        friendshipId: friendship.getId()
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