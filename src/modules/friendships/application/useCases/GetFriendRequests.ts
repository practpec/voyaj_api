// src/modules/friendships/application/useCases/GetFriendRequests.ts
import { IFriendshipRepository } from '../../domain/interfaces/IFriendshipRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { FriendshipService } from '../../domain/FriendshipService';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { FriendRequestResponseDTO, FriendshipDTOMapper } from '../dtos/FriendshipDTO';

export class GetFriendRequestsUseCase {
  private logger: LoggerService;

  constructor(
    private friendshipRepository: IFriendshipRepository,
    private userRepository: IUserRepository,
    private friendshipService: FriendshipService,
    logger: LoggerService
  ) {
    this.logger = logger;
  }

  public async execute(
    userId: string, 
    type: 'received' | 'sent' = 'received'
  ): Promise<FriendRequestResponseDTO[]> {
    try {
      // Obtener solicitudes según el tipo
      const requests = type === 'received'
        ? await this.friendshipRepository.findPendingRequestsByRecipient(userId)
        : await this.friendshipRepository.findPendingRequestsBySender(userId);

      if (requests.length === 0) {
        return [];
      }

      // Obtener información de los usuarios relacionados
      const requestsData = await Promise.all(
        requests.map(async (request) => {
          // Para solicitudes recibidas, obtener info del solicitante
          // Para solicitudes enviadas, obtener info del destinatario
          const targetUserId = type === 'received' 
            ? request.getUserId() 
            : request.getFriendId();

          const targetUser = await this.userRepository.findById(targetUserId);
          if (!targetUser || targetUser.isDeleted) {
            return null;
          }

          // Obtener número de amigos en común
          const mutualFriendsCount = await this.friendshipService.getMutualFriendsCount(userId, targetUserId);

          return FriendshipDTOMapper.toFriendRequestResponse(
            request.toPublicData(),
            targetUser.toPublicData(),
            mutualFriendsCount
          );
        })
      );

      // Filtrar resultados nulos
      const validRequestsData = requestsData.filter(request => request !== null) as FriendRequestResponseDTO[];

      this.logger.info(`Solicitudes de amistad obtenidas para usuario ${userId}`, {
        userId,
        type,
        requestsCount: validRequestsData.length
      });

      return validRequestsData;

    } catch (error) {
      this.logger.error(`Error obteniendo solicitudes de amistad ${type} del usuario ${userId}:`, error);
      throw new Error('Error obteniendo solicitudes de amistad');
    }
  }
}