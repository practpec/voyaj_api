// src/modules/friendships/application/useCases/GetFriendshipStats.ts
import { IFriendshipRepository } from '../../domain/interfaces/IFriendshipRepository';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { FriendshipStatsDTO } from '../dtos/FriendshipDTO';

export class GetFriendshipStatsUseCase {
  private logger: LoggerService;

  constructor(
    private friendshipRepository: IFriendshipRepository,
    logger: LoggerService
  ) {
    this.logger = logger;
  }

  public async execute(userId: string): Promise<FriendshipStatsDTO> {
    try {
      // Obtener estadísticas en paralelo para mejor performance
      const [
        totalFriends,
        pendingReceived,
        pendingSent,
        totalRejected
      ] = await Promise.all([
        this.friendshipRepository.countFriendsByUserId(userId),
        this.friendshipRepository.countPendingRequestsByRecipient(userId),
        this.friendshipRepository.countPendingRequestsBySender(userId),
        this.friendshipRepository.countRejectedRequestsByUserId(userId)
      ]);

      const stats: FriendshipStatsDTO = {
        totalFriends,
        pendingRequestsReceived: pendingReceived,
        pendingRequestsSent: pendingSent,
        totalRequestsSent: pendingSent + totalRejected,
        friendshipRate: pendingSent > 0 ? (totalFriends / (totalFriends + pendingSent + totalRejected)) * 100 : 100
      };

      this.logger.info(`Estadísticas de amistad obtenidas para usuario ${userId}`, {
        userId,
        stats
      });

      return stats;

    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas de amistad del usuario ${userId}:`, error);
      throw new Error('Error obteniendo estadísticas de amistad');
    }
  }
}