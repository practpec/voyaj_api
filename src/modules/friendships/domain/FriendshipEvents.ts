// src/modules/friendships/domain/FriendshipEvents.ts
import { DomainEvent } from '../../../shared/events/DomainEvent';

export const FRIENDSHIP_EVENT_TYPES = {
  FRIEND_REQUEST_SENT: 'friendship.request.sent',
  FRIEND_REQUEST_ACCEPTED: 'friendship.request.accepted',
  FRIEND_REQUEST_REJECTED: 'friendship.request.rejected',
  FRIENDSHIP_REMOVED: 'friendship.removed'
} as const;

// Interfaces para los datos de eventos
export interface FriendRequestSentEventData {
  requesterId: string;
  recipientId: string;
  friendshipId: string;
}

export interface FriendRequestAcceptedEventData {
  requesterId: string;
  recipientId: string;
  friendshipId: string;
}

export interface FriendRequestRejectedEventData {
  requesterId: string;
  recipientId: string;
  friendshipId: string;
}

export interface FriendshipRemovedEventData {
  userId: string;
  friendId: string;
  friendshipId: string;
}

// Clases de eventos que extienden DomainEvent (para ser compatibles con tu código actual)
export class FriendRequestSentEvent extends DomainEvent {
  constructor(
    public readonly requesterId: string,
    public readonly recipientId: string,
    public readonly friendshipId: string
  ) {
    super(
      FRIENDSHIP_EVENT_TYPES.FRIEND_REQUEST_SENT,
      {
        requesterId,
        recipientId,
        friendshipId
      },
      friendshipId,
      'Friendship'
    );
  }
}

export class FriendRequestAcceptedEvent extends DomainEvent {
  constructor(
    public readonly requesterId: string,
    public readonly recipientId: string,
    public readonly friendshipId: string
  ) {
    super(
      FRIENDSHIP_EVENT_TYPES.FRIEND_REQUEST_ACCEPTED,
      {
        requesterId,
        recipientId,
        friendshipId
      },
      friendshipId,
      'Friendship'
    );
  }
}

export class FriendRequestRejectedEvent extends DomainEvent {
  constructor(
    public readonly requesterId: string,
    public readonly recipientId: string,
    public readonly friendshipId: string
  ) {
    super(
      FRIENDSHIP_EVENT_TYPES.FRIEND_REQUEST_REJECTED,
      {
        requesterId,
        recipientId,
        friendshipId
      },
      friendshipId,
      'Friendship'
    );
  }
}

export class FriendshipRemovedEvent extends DomainEvent {
  constructor(
    public override readonly userId: string,
    public readonly friendId: string,
    public readonly friendshipId: string
  ) {
    super(
      FRIENDSHIP_EVENT_TYPES.FRIENDSHIP_REMOVED,
      {
        userId,
        friendId,
        friendshipId
      },
      friendshipId,
      'Friendship'
    );
  }
}

// Factory class para crear eventos (mantengo para compatibilidad)
export class FriendshipEvents {
  public static friendRequestSent(data: FriendRequestSentEventData): FriendRequestSentEvent {
    return new FriendRequestSentEvent(data.requesterId, data.recipientId, data.friendshipId);
  }

  public static friendRequestAccepted(data: FriendRequestAcceptedEventData): FriendRequestAcceptedEvent {
    return new FriendRequestAcceptedEvent(data.requesterId, data.recipientId, data.friendshipId);
  }

  public static friendRequestRejected(data: FriendRequestRejectedEventData): FriendRequestRejectedEvent {
    return new FriendRequestRejectedEvent(data.requesterId, data.recipientId, data.friendshipId);
  }

  public static friendshipRemoved(data: FriendshipRemovedEventData): FriendshipRemovedEvent {
    return new FriendshipRemovedEvent(data.userId, data.friendId, data.friendshipId);
  }
}