// src/modules/friendships/application/useCases/GetUserFriends.ts
import { IFriendshipRepository } from '../../domain/interfaces/IFriendshipRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { FriendshipService } from '../../domain/FriendshipService';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { FriendListResponseDTO, FriendshipDTOMapper } from '../dtos/FriendshipDTO';

export class GetUserFriendsUseCase {
  private logger: LoggerService;

  constructor(
    private friendshipRepository: IFriendshipRepository,
    private userRepository: IUserRepository,
    private friendshipService: FriendshipService,
    logger: LoggerService
  ) {
    this.logger = logger;
  }

  public async execute(userId: string): Promise<FriendListResponseDTO[]> {
    try {
      // Obtener todas las amistades aceptadas del usuario
      const friendships = await this.friendshipRepository.findFriendsByUserId(userId);

      if (friendships.length === 0) {
        return [];
      }

      // Obtener información de todos los amigos
      const friendsData = await Promise.all(
        friendships.map(async (friendship) => {
          // Determinar cuál es el ID del amigo
          const friendId = friendship.getUserId() === userId 
            ? friendship.getFriendId() 
            : friendship.getUserId();

          // Obtener información del amigo
          const friendUser = await this.userRepository.findById(friendId);
          if (!friendUser || friendUser.isDeleted) {
            return null;
          }

          // Obtener número de amigos en común (opcional)
          const mutualFriendsCount = await this.friendshipService.getMutualFriendsCount(userId, friendId);

          return FriendshipDTOMapper.toFriendListResponse(
            friendship.toPublicData(),
            friendUser.toPublicData(),
            userId,
            mutualFriendsCount
          );
        })
      );

      // Filtrar resultados nulos
      const validFriendsData = friendsData.filter(friend => friend !== null) as FriendListResponseDTO[];

      this.logger.info(`Amigos obtenidos para usuario ${userId}`, {
        userId,
        friendsCount: validFriendsData.length
      });

      return validFriendsData;

    } catch (error) {
      this.logger.error(`Error obteniendo amigos del usuario ${userId}:`, error);
      throw ErrorHandler.createInternalServerError('Error obteniendo lista de amigos');
    }
  }
}