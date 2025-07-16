// src/modules/friendships/index.ts

// Domain exports
export { Friendship } from './domain/Friendship';
export { FriendshipService } from './domain/FriendshipService';
export { 
  FriendshipEvents, 
  FRIENDSHIP_EVENT_TYPES,
  FriendRequestSentEvent,
  FriendRequestAcceptedEvent,
  FriendRequestRejectedEvent,
  FriendshipRemovedEvent
} from './domain/FriendshipEvents';
export { IFriendshipRepository } from './domain/interfaces/IFriendshipRepository';

// Application exports
export { SendFriendRequestUseCase } from './application/useCases/SendFriendRequest';
export { AcceptFriendRequestUseCase } from './application/useCases/AcceptFriendRequest';
export { RejectFriendRequestUseCase } from './application/useCases/RejectFriendRequest';
export { GetUserFriendsUseCase } from './application/useCases/GetUserFriends';
export { GetFriendRequestsUseCase } from './application/useCases/GetFriendRequests';
export { RemoveFriendshipUseCase } from './application/useCases/RemoveFriendship';
export { GetFriendSuggestionsUseCase } from './application/useCases/GetFriendSuggestions';

// DTOs
export {
  SendFriendRequestDTO,
  FriendshipResponseDTO,
  FriendListResponseDTO,
  FriendRequestResponseDTO,
  FriendSuggestionDTO,
  FriendshipStatsDTO,
  FriendshipDTOMapper
} from './application/dtos/FriendshipDTO';

// Infrastructure exports
export { FriendshipController } from './infrastructure/controllers/FriendshipController';
export { FriendshipMongoRepository } from './infrastructure/repositories/FriendshipMongoRepository';
export { friendshipRoutes } from './infrastructure/routes/friendshipRoutes';
export { FriendshipEventHandlers } from './infrastructure/events/FriendshipEventHandlers';

// Module configuration
export class FriendshipModule {
  public static async initialize(): Promise<void> {
    // Inicializar manejadores de eventos
    new FriendshipEventHandlers();
    
    console.log('✅ Friendship module initialized successfully');
  }
}