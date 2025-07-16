// src/modules/friendships/application/useCases/GetFriendSuggestions.ts
import { IFriendshipRepository } from '../../domain/interfaces/IFriendshipRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { FriendshipService } from '../../domain/FriendshipService';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { FriendSuggestionDTO, FriendshipDTOMapper } from '../dtos/FriendshipDTO';

export class GetFriendSuggestionsUseCase {
  private logger: LoggerService;

  constructor(
    private friendshipRepository: IFriendshipRepository,
    private userRepository: IUserRepository,
    private friendshipService: FriendshipService,
    logger: LoggerService
  ) {
    this.logger = logger;
  }

  public async execute(userId: string, limit: number = 10): Promise<FriendSuggestionDTO[]> {
    try {
      // Obtener sugerencias desde el repositorio
      const suggestions = await this.friendshipRepository.findSuggestedFriends(userId, limit);

      if (suggestions.length === 0) {
        return [];
      }

      // Procesar cada sugerencia
      const suggestionsData = await Promise.all(
        suggestions.map(async (suggestion) => {
          const suggestedUser = await this.userRepository.findById(suggestion.userId);
          if (!suggestedUser || suggestedUser.isDeleted) {
            return null;
          }

          // Obtener número de amigos en común
          const mutualFriendsCount = await this.friendshipService.getMutualFriendsCount(
            userId, 
            suggestion.userId
          );

          // Determinar razón de la conexión
          let connectionReason = 'Nuevos usuarios';
          if (mutualFriendsCount > 0) {
            connectionReason = `${mutualFriendsCount} amigos en común`;
          }

          return FriendshipDTOMapper.toFriendSuggestion(
            suggestedUser.toPublicData(),
            mutualFriendsCount,
            connectionReason
          );
        })
      );

      // Filtrar resultados nulos y ordenar por amigos en común
      const validSuggestions = suggestionsData
        .filter(suggestion => suggestion !== null) as FriendSuggestionDTO[]
        .sort((a, b) => b.mutualFriendsCount - a.mutualFriendsCount);

      this.logger.info(`Sugerencias de amigos obtenidas para usuario ${userId}`, {
        userId,
        suggestionsCount: validSuggestions.length
      });

      return validSuggestions;

    } catch (error) {
      this.logger.error(`Error obteniendo sugerencias de amigos para usuario ${userId}:`, error);
      throw ErrorHandler.createInternalServerError('Error obteniendo sugerencias de amigos');
    }
  }
}