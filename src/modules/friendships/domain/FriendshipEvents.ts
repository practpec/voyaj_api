// src/modules/friendships/domain/FriendshipEvents.ts
import { DomainEvent } from '../../../shared/events/EventBus';

export const FRIENDSHIP_EVENT_TYPES = {
  FRIEND_REQUEST_SENT: 'friendship.request.sent',
  FRIEND_REQUEST_ACCEPTED: 'friendship.request.accepted',
  FRIEND_REQUEST_REJECTED: 'friendship.request.rejected',
  FRIENDSHIP_REMOVED: 'friendship.removed'
} as const;

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

export class FriendshipEvents {
  public static friendRequestSent(data: FriendRequestSentEventData): DomainEvent {
    return {
      eventType: FRIENDSHIP_EVENT_TYPES.FRIEND_REQUEST_SENT,
      aggregateId: data.friendshipId,
      aggregateType: 'Friendship',
      eventData: data,
      timestamp: new Date(),
      userId: data.requesterId
    };
  }

  public static friendRequestAccepted(data: FriendRequestAcceptedEventData): DomainEvent {
    return {
      eventType: FRIENDSHIP_EVENT_TYPES.FRIEND_REQUEST_ACCEPTED,
      aggregateId: data.friendshipId,
      aggregateType: 'Friendship',
      eventData: data,
      timestamp: new Date(),
      userId: data.recipientId
    };
  }

  public static friendRequestRejected(data: FriendRequestRejectedEventData): DomainEvent {
    return {
      eventType: FRIENDSHIP_EVENT_TYPES.FRIEND_REQUEST_REJECTED,
      aggregateId: data.friendshipId,
      aggregateType: 'Friendship',
      eventData: data,
      timestamp: new Date(),
      userId: data.recipientId
    };
  }

  public static friendshipRemoved(data: FriendshipRemovedEventData): DomainEvent {
    return {
      eventType: FRIENDSHIP_EVENT_TYPES.FRIENDSHIP_REMOVED,
      aggregateId: data.friendshipId,
      aggregateType: 'Friendship',
      eventData: data,
      timestamp: new Date(),
      userId: data.userId
    };
  }
}