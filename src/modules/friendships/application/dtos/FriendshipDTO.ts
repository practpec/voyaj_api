// src/modules/friendships/application/dtos/FriendshipDTO.ts
import { FriendshipData } from '../../domain/Friendship';

export interface FriendshipResponseDTO {
  id: string;
  userId: string;
  friendId: string;
  status: 'pendiente' | 'aceptada' | 'rechazada';
  createdAt: Date;
  acceptedAt?: Date;
  userInfo?: {
    id: string;
    name: string;
    email: string;
    profilePhotoUrl?: string;
  };
  friendInfo?: {
    id: string;
    name: string;
    email: string;
    profilePhotoUrl?: string;
  };
}

export interface FriendListResponseDTO {
  id: string;
  friendInfo: {
    id: string;
    name: string;
    email: string;
    profilePhotoUrl?: string;
  };
  friendshipDate: Date;
  mutualFriendsCount?: number;
}

export interface FriendRequestResponseDTO {
  id: string;
  requesterInfo: {
    id: string;
    name: string;
    email: string;
    profilePhotoUrl?: string;
  };
  requestDate: Date;
  mutualFriendsCount?: number;
}

export interface FriendSuggestionDTO {
  id: string;
  name: string;
  email: string;
  profilePhotoUrl?: string;
  mutualFriendsCount: number;
  connectionReason: string;
}

export interface FriendshipStatsDTO {
  totalFriends: number;
  pendingRequestsSent: number;
  pendingRequestsReceived: number;
}

export class FriendshipDTOMapper {
  public static toFriendshipResponse(
    friendship: FriendshipData,
    userInfo?: any,
    friendInfo?: any
  ): FriendshipResponseDTO {
    return {
      id: friendship.id,
      userId: friendship.userId,
      friendId: friendship.friendId,
      status: friendship.status,
      createdAt: friendship.createdAt,
      acceptedAt: friendship.acceptedAt,
      userInfo: userInfo ? {
        id: userInfo.id,
        name: userInfo.name || userInfo.nombre,
        email: userInfo.email || userInfo.correo_electronico,
        profilePhotoUrl: userInfo.profilePhotoUrl || userInfo.url_foto_perfil
      } : undefined,
      friendInfo: friendInfo ? {
        id: friendInfo.id,
        name: friendInfo.name || friendInfo.nombre,
        email: friendInfo.email || friendInfo.correo_electronico,
        profilePhotoUrl: friendInfo.profilePhotoUrl || friendInfo.url_foto_perfil
      } : undefined
    };
  }

  public static toFriendListResponse(
    friendship: FriendshipData,
    friendInfo: any,
    currentUserId: string,
    mutualFriendsCount?: number
  ): FriendListResponseDTO {
    return {
      id: friendship.id,
      friendInfo: {
        id: friendInfo.id,
        name: friendInfo.name || friendInfo.nombre,
        email: friendInfo.email || friendInfo.correo_electronico,
        profilePhotoUrl: friendInfo.profilePhotoUrl || friendInfo.url_foto_perfil
      },
      friendshipDate: friendship.acceptedAt || friendship.createdAt,
      mutualFriendsCount
    };
  }

  public static toFriendRequestResponse(
    friendship: FriendshipData,
    requesterInfo: any,
    mutualFriendsCount?: number
  ): FriendRequestResponseDTO {
    return {
      id: friendship.id,
      requesterInfo: {
        id: requesterInfo.id,
        name: requesterInfo.name || requesterInfo.nombre,
        email: requesterInfo.email || requesterInfo.correo_electronico,
        profilePhotoUrl: requesterInfo.profilePhotoUrl || requesterInfo.url_foto_perfil
      },
      requestDate: friendship.createdAt,
      mutualFriendsCount
    };
  }

  public static toFriendSuggestion(
    userInfo: any,
    mutualFriendsCount: number,
    connectionReason: string = 'Amigos en común'
  ): FriendSuggestionDTO {
    return {
      id: userInfo.id,
      name: userInfo.name || userInfo.nombre,
      email: userInfo.email || userInfo.correo_electronico,
      profilePhotoUrl: userInfo.profilePhotoUrl || userInfo.url_foto_perfil,
      mutualFriendsCount,
      connectionReason
    };
  }
}