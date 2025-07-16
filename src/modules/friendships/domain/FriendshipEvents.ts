// src/modules/friendships/domain/FriendshipEvents.ts
import { DomainEvent } from '../../../shared/events/DomainEvent';

export const FRIENDSHIP_EVENT_TYPES = {
  FRIEND_REQUEST_SENT: 'friendship.request.sent',
  FRIEND_REQUEST_ACCEPTED: 'friendship.request.accepted',
  FRIEND_REQUEST_REJECTED: 'friendship.request.rejected',
  FRIENDSHIP_REMOVED: 'friendship.removed'
} as const;

export class FriendRequestSentEvent extends DomainEvent {
  constructor(
    public readonly requesterId: string,
    public readonly recipientId: string,
    public readonly friendshipId: string
  ) {
    super(FRIENDSHIP_EVENT_TYPES.FRIEND_REQUEST_SENT, {
      requesterId,
      recipientId,
      friendshipId
    });
  }
}

export class FriendRequestAcceptedEvent extends DomainEvent {
  constructor(
    public readonly requesterId: string,
    public readonly recipientId: string,
    public readonly friendshipId: string
  ) {
    super(FRIENDSHIP_EVENT_TYPES.FRIEND_REQUEST_ACCEPTED, {
      requesterId,
      recipientId,
      friendshipId
    });
  }
}

export class FriendRequestRejectedEvent extends DomainEvent {
  constructor(
    public readonly requesterId: string,
    public readonly recipientId: string,
    public readonly friendshipId: string
  ) {
    super(FRIENDSHIP_EVENT_TYPES.FRIEND_REQUEST_REJECTED, {
      requesterId,
      recipientId,
      friendshipId
    });
  }
}

export class FriendshipRemovedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly friendId: string,
    public readonly friendshipId: string
  ) {
    super(FRIENDSHIP_EVENT_TYPES.FRIENDSHIP_REMOVED, {
      userId,
      friendId,
      friendshipId
    });
  }
}