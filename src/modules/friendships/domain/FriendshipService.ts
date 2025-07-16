// src/modules/friendships/domain/FriendshipService.ts
import { Friendship } from './Friendship';
import { IFriendshipRepository } from './interfaces/IFriendshipRepository';
import { FRIENDSHIP_STATUS } from '../../../shared/constants';

export class FriendshipService {
  constructor(private friendshipRepository: IFriendshipRepository) {}

  public async canSendFriendRequest(userId: string, friendId: string): Promise<boolean> {
    // Verificar si ya existe una amistad entre los usuarios
    const existingFriendship = await this.friendshipRepository.findByUsers(userId, friendId);
    
    if (existingFriendship) {
      return false;
    }

    // Verificar si ya existe una solicitud pendiente en cualquier dirección
    const pendingRequest = await this.friendshipRepository.findPendingBetweenUsers(userId, friendId);
    
    return !pendingRequest;
  }

  public async areFriends(userId: string, friendId: string): Promise<boolean> {
    const friendship = await this.friendshipRepository.findAcceptedBetweenUsers(userId, friendId);
    return !!friendship;
  }

  public async getFriendshipStatus(userId: string, friendId: string): Promise<string | null> {
    const friendship = await this.friendshipRepository.findByUsers(userId, friendId);
    return friendship ? friendship.getStatus() : null;
  }

  public async getMutualFriendsCount(userId: string, friendId: string): Promise<number> {
    const userFriends = await this.friendshipRepository.findFriendsByUserId(userId);
    const friendFriends = await this.friendshipRepository.findFriendsByUserId(friendId);
    
    const userFriendIds = userFriends.map(f => 
      f.getUserId() === userId ? f.getFriendId() : f.getUserId()
    );
    
    const friendFriendIds = friendFriends.map(f => 
      f.getUserId() === friendId ? f.getFriendId() : f.getUserId()
    );
    
    const mutualFriends = userFriendIds.filter(id => friendFriendIds.includes(id));
    return mutualFriends.length;
  }

  public async validateFriendshipAction(
    friendship: Friendship, 
    actionUserId: string, 
    action: 'accept' | 'reject'
  ): Promise<void> {
    if (friendship.getIsDeleted()) {
      throw new Error('La solicitud de amistad ha sido eliminada');
    }

    if (!friendship.isPending()) {
      throw new Error('Solo se pueden procesar solicitudes pendientes');
    }

    // Solo el destinatario puede aceptar o rechazar
    if (friendship.getFriendId() !== actionUserId) {
      throw new Error('Solo el destinatario puede procesar esta solicitud');
    }
  }

  public async validateRemovalPermission(
    friendship: Friendship, 
    userId: string
  ): Promise<void> {
    if (friendship.getIsDeleted()) {
      throw new Error('La amistad ya ha sido eliminada');
    }

    if (!friendship.isAccepted()) {
      throw new Error('Solo se pueden eliminar amistades aceptadas');
    }

    // Verificar que el usuario sea parte de la amistad
    if (friendship.getUserId() !== userId && friendship.getFriendId() !== userId) {
      throw new Error('No tienes permisos para eliminar esta amistad');
    }
  }
}