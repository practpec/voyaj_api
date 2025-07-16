// src/modules/trips/domain/TripEvents.ts
import { Trip } from './Trip';
import { TripMember } from './TripMember';

export const TRIP_EVENT_TYPES = {
  // Eventos de viaje
  TRIP_CREATED: 'trip.created',
  TRIP_UPDATED: 'trip.updated',
  TRIP_DELETED: 'trip.deleted',
  TRIP_STATUS_CHANGED: 'trip.status.changed',
  TRIP_COMPLETED: 'trip.completed',
  TRIP_CANCELLED: 'trip.cancelled',
  
  // Eventos de miembros
  MEMBER_INVITED: 'trip.member.invited',
  MEMBER_JOINED: 'trip.member.joined',
  MEMBER_LEFT: 'trip.member.left',
  MEMBER_REMOVED: 'trip.member.removed',
  MEMBER_ROLE_CHANGED: 'trip.member.role.changed',
  
  // Eventos de invitaciones
  INVITATION_SENT: 'trip.invitation.sent',
  INVITATION_ACCEPTED: 'trip.invitation.accepted',
  INVITATION_REJECTED: 'trip.invitation.rejected',
  INVITATION_CANCELLED: 'trip.invitation.cancelled'
} as const;

// Eventos base
export interface BaseTripEvent {
  eventId: string;
  eventType: string;
  tripId: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Eventos de viaje
export interface TripCreatedEvent extends BaseTripEvent {
  eventType: typeof TRIP_EVENT_TYPES.TRIP_CREATED;
  data: {
    trip: Trip;
    isGroupTrip: boolean;
  };
}

export interface TripUpdatedEvent extends BaseTripEvent {
  eventType: typeof TRIP_EVENT_TYPES.TRIP_UPDATED;
  data: {
    trip: Trip;
    previousData: Partial<Trip>;
    changedFields: string[];
  };
}

export interface TripDeletedEvent extends BaseTripEvent {
  eventType: typeof TRIP_EVENT_TYPES.TRIP_DELETED;
  data: {
    tripId: string;
    tripTitle: string;
    memberCount: number;
  };
}

export interface TripStatusChangedEvent extends BaseTripEvent {
  eventType: typeof TRIP_EVENT_TYPES.TRIP_STATUS_CHANGED;
  data: {
    trip: Trip;
    previousStatus: string;
    newStatus: string;
    reason?: string;
  };
}

export interface TripCompletedEvent extends BaseTripEvent {
  eventType: typeof TRIP_EVENT_TYPES.TRIP_COMPLETED;
  data: {
    trip: Trip;
    totalExpenses: number;
    memberCount: number;
    duration: number;
  };
}

export interface TripCancelledEvent extends BaseTripEvent {
  eventType: typeof TRIP_EVENT_TYPES.TRIP_CANCELLED;
  data: {
    trip: Trip;
    reason?: string;
    memberCount: number;
  };
}

// Eventos de miembros
export interface MemberInvitedEvent extends BaseTripEvent {
  eventType: typeof TRIP_EVENT_TYPES.MEMBER_INVITED;
  data: {
    tripMember: TripMember;
    invitedUserEmail: string;
    inviterName: string;
    tripTitle: string;
  };
}

export interface MemberJoinedEvent extends BaseTripEvent {
  eventType: typeof TRIP_EVENT_TYPES.MEMBER_JOINED;
  data: {
    tripMember: TripMember;
    memberName: string;
    tripTitle: string;
    totalMembers: number;
  };
}

export interface MemberLeftEvent extends BaseTripEvent {
  eventType: typeof TRIP_EVENT_TYPES.MEMBER_LEFT;
  data: {
    tripMember: TripMember;
    memberName: string;
    tripTitle: string;
    reason?: string;
  };
}

export interface MemberRemovedEvent extends BaseTripEvent {
  eventType: typeof TRIP_EVENT_TYPES.MEMBER_REMOVED;
  data: {
    tripMember: TripMember;
    removedMemberName: string;
    removedByName: string;
    tripTitle: string;
    reason?: string;
  };
}

export interface MemberRoleChangedEvent extends BaseTripEvent {
  eventType: typeof TRIP_EVENT_TYPES.MEMBER_ROLE_CHANGED;
  data: {
    tripMember: TripMember;
    previousRole: string;
    newRole: string;
    changedByName: string;
    memberName: string;
    tripTitle: string;
  };
}

// Eventos de invitaciones
export interface InvitationSentEvent extends BaseTripEvent {
  eventType: typeof TRIP_EVENT_TYPES.INVITATION_SENT;
  data: {
    tripMember: TripMember;
    invitedUserEmail: string;
    inviterName: string;
    tripTitle: string;
    invitationId: string;
  };
}

export interface InvitationAcceptedEvent extends BaseTripEvent {
  eventType: typeof TRIP_EVENT_TYPES.INVITATION_ACCEPTED;
  data: {
    tripMember: TripMember;
    memberName: string;
    tripTitle: string;
    acceptedAt: Date;
  };
}

export interface InvitationRejectedEvent extends BaseTripEvent {
  eventType: typeof TRIP_EVENT_TYPES.INVITATION_REJECTED;
  data: {
    tripMember: TripMember;
    rejectedUserName: string;
    tripTitle: string;
    rejectedAt: Date;
    reason?: string;
  };
}

export interface InvitationCancelledEvent extends BaseTripEvent {
  eventType: typeof TRIP_EVENT_TYPES.INVITATION_CANCELLED;
  data: {
    tripMember: TripMember;
    cancelledUserName: string;
    cancelledByName: string;
    tripTitle: string;
    reason?: string;
  };
}

// Union type de todos los eventos
export type TripEvent = 
  | TripCreatedEvent
  | TripUpdatedEvent
  | TripDeletedEvent
  | TripStatusChangedEvent
  | TripCompletedEvent
  | TripCancelledEvent
  | MemberInvitedEvent
  | MemberJoinedEvent
  | MemberLeftEvent
  | MemberRemovedEvent
  | MemberRoleChangedEvent
  | InvitationSentEvent
  | InvitationAcceptedEvent
  | InvitationRejectedEvent
  | InvitationCancelledEvent;

// Clase helper para crear eventos
export class TripEvents {
  private static generateEventId(): string {
    return `trip_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public static createTripCreatedEvent(trip: Trip, userId: string): TripCreatedEvent {
    return {
      eventId: this.generateEventId(),
      eventType: TRIP_EVENT_TYPES.TRIP_CREATED,
      tripId: trip.id,
      userId,
      timestamp: new Date(),
      data: {
        trip,
        isGroupTrip: trip.isGroupTrip
      }
    };
  }

  public static createTripUpdatedEvent(
    trip: Trip, 
    userId: string, 
    previousData: Partial<Trip>, 
    changedFields: string[]
  ): TripUpdatedEvent {
    return {
      eventId: this.generateEventId(),
      eventType: TRIP_EVENT_TYPES.TRIP_UPDATED,
      tripId: trip.id,
      userId,
      timestamp: new Date(),
      data: {
        trip,
        previousData,
        changedFields
      }
    };
  }

  public static createMemberInvitedEvent(
    tripMember: TripMember,
    invitedUserEmail: string,
    inviterName: string,
    tripTitle: string
  ): MemberInvitedEvent {
    return {
      eventId: this.generateEventId(),
      eventType: TRIP_EVENT_TYPES.MEMBER_INVITED,
      tripId: tripMember.tripId,
      userId: tripMember.userId,
      timestamp: new Date(),
      data: {
        tripMember,
        invitedUserEmail,
        inviterName,
        tripTitle
      }
    };
  }

  public static createInvitationAcceptedEvent(
    tripMember: TripMember,
    memberName: string,
    tripTitle: string
  ): InvitationAcceptedEvent {
    return {
      eventId: this.generateEventId(),
      eventType: TRIP_EVENT_TYPES.INVITATION_ACCEPTED,
      tripId: tripMember.tripId,
      userId: tripMember.userId,
      timestamp: new Date(),
      data: {
        tripMember,
        memberName,
        tripTitle,
        acceptedAt: new Date()
      }
    };
  }

  public static createInvitationRejectedEvent(
    tripMember: TripMember,
    rejectedUserName: string,
    tripTitle: string,
    reason?: string
  ): InvitationRejectedEvent {
    return {
      eventId: this.generateEventId(),
      eventType: TRIP_EVENT_TYPES.INVITATION_REJECTED,
      tripId: tripMember.tripId,
      userId: tripMember.userId,
      timestamp: new Date(),
      data: {
        tripMember,
        rejectedUserName,
        tripTitle,
        rejectedAt: new Date(),
        reason
      }
    };
  }
}