import { EVENT_TYPES } from '../../../shared/constants';

// Eventos del dominio de usuario
export interface UserCreatedEventData {
  userId: string;
  email: string;
  name?: string;
  createdAt: Date;
}

export interface UserUpdatedEventData {
  userId: string;
  email: string;
  changes: {
    name?: { from?: string; to?: string };
    profilePicture?: { from?: string; to?: string };
  };
  updatedAt: Date;
}

export interface UserDeletedEventData {
  userId: string;
  email: string;
  deletedAt: Date;
}

export interface UserLoggedInEventData {
  userId: string;
  email: string;
  ip: string;
  userAgent?: string;
  loginAt: Date;
}

export interface UserLoggedOutEventData {
  userId: string;
  email: string;
  logoutAt: Date;
}

export interface EmailVerifiedEventData {
  userId: string;
  email: string;
  verifiedAt: Date;
}

export interface PasswordChangedEventData {
  userId: string;
  email: string;
  changedAt: Date;
  ip?: string;
}

export interface AccountLockedEventData {
  userId: string;
  email: string;
  reason: string;
  lockedAt: Date;
  lockedUntil?: Date;
}

export interface UserRestoredEventData {
  userId: string;
  email: string;
  restoredAt: Date;
  restoredBy?: string;
}

export interface PasswordResetRequestedEventData {
  userId: string;
  email: string;
  requestedAt: Date;
  ip?: string;
}

export interface PasswordResetCompletedEventData {
  userId: string;
  email: string;
  completedAt: Date;
  ip?: string;
}

export interface EmailVerificationRequestedEventData {
  userId: string;
  email: string;
  requestedAt: Date;
}

// Clase para crear eventos de usuario
export class UserEvents {
  public static userCreated(data: UserCreatedEventData): {
    eventType: string;
    eventData: UserCreatedEventData;
  } {
    return {
      eventType: EVENT_TYPES.USER_CREATED,
      eventData: data
    };
  }

  public static userUpdated(data: UserUpdatedEventData): {
    eventType: string;
    eventData: UserUpdatedEventData;
  } {
    return {
      eventType: EVENT_TYPES.USER_UPDATED,
      eventData: data
    };
  }

  public static userDeleted(data: UserDeletedEventData): {
    eventType: string;
    eventData: UserDeletedEventData;
  } {
    return {
      eventType: EVENT_TYPES.USER_DELETED,
      eventData: data
    };
  }

  public static userLoggedIn(data: UserLoggedInEventData): {
    eventType: string;
    eventData: UserLoggedInEventData;
  } {
    return {
      eventType: EVENT_TYPES.USER_LOGGED_IN,
      eventData: data
    };
  }

  public static userLoggedOut(data: UserLoggedOutEventData): {
    eventType: string;
    eventData: UserLoggedOutEventData;
  } {
    return {
      eventType: EVENT_TYPES.USER_LOGGED_OUT,
      eventData: data
    };
  }

  public static emailVerified(data: EmailVerifiedEventData): {
    eventType: string;
    eventData: EmailVerifiedEventData;
  } {
    return {
      eventType: EVENT_TYPES.EMAIL_VERIFIED,
      eventData: data
    };
  }

  public static passwordChanged(data: PasswordChangedEventData): {
    eventType: string;
    eventData: PasswordChangedEventData;
  } {
    return {
      eventType: EVENT_TYPES.PASSWORD_CHANGED,
      eventData: data
    };
  }

  public static accountLocked(data: AccountLockedEventData): {
    eventType: string;
    eventData: AccountLockedEventData;
  } {
    return {
      eventType: EVENT_TYPES.ACCOUNT_LOCKED,
      eventData: data
    };
  }

  public static userRestored(data: UserRestoredEventData): {
    eventType: string;
    eventData: UserRestoredEventData;
  } {
    return {
      eventType: 'user.restored',
      eventData: data
    };
  }

  public static passwordResetRequested(data: PasswordResetRequestedEventData): {
    eventType: string;
    eventData: PasswordResetRequestedEventData;
  } {
    return {
      eventType: 'user.password_reset_requested',
      eventData: data
    };
  }

  public static passwordResetCompleted(data: PasswordResetCompletedEventData): {
    eventType: string;
    eventData: PasswordResetCompletedEventData;
  } {
    return {
      eventType: 'user.password_reset_completed',
      eventData: data
    };
  }

  public static emailVerificationRequested(data: EmailVerificationRequestedEventData): {
    eventType: string;
    eventData: EmailVerificationRequestedEventData;
  } {
    return {
      eventType: 'user.email_verification_requested',
      eventData: data
    };
  }
}