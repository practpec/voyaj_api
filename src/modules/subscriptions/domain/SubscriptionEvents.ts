// src/modules/subscriptions/domain/SubscriptionEvents.ts

// Eventos del dominio de suscripciones
export interface SubscriptionCreatedEventData {
  subscriptionId: string;
  userId: string;
  planCode: string;
  status: string;
  createdAt: Date;
  stripeSubscriptionId?: string;
}

export interface SubscriptionActivatedEventData {
  subscriptionId: string;
  userId: string;
  planCode: string;
  activatedAt: Date;
  currentPeriodEnd: Date;
}

export interface SubscriptionCanceledEventData {
  subscriptionId: string;
  userId: string;
  planCode: string;
  canceledAt: Date;
  cancelAtPeriodEnd: boolean;
  reason?: string;
}

export interface SubscriptionPlanChangedEventData {
  subscriptionId: string;
  userId: string;
  oldPlanCode: string;
  newPlanCode: string;
  changedAt: Date;
}

export interface SubscriptionExpiredEventData {
  subscriptionId: string;
  userId: string;
  planCode: string;
  expiredAt: Date;
}

export interface PaymentSucceededEventData {
  subscriptionId: string;
  userId: string;
  amount: number;
  currency: string;
  paidAt: Date;
  invoiceId?: string;
}

export interface PaymentFailedEventData {
  subscriptionId: string;
  userId: string;
  amount: number;
  currency: string;
  failedAt: Date;
  reason: string;
  attemptCount: number;
}

export interface TrialEndingSoonEventData {
  subscriptionId: string;
  userId: string;
  planCode: string;
  trialEndDate: Date;
  daysRemaining: number;
}

// Tipos de eventos
export const SUBSCRIPTION_EVENT_TYPES = {
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_ACTIVATED: 'subscription.activated',
  SUBSCRIPTION_CANCELED: 'subscription.canceled',
  SUBSCRIPTION_PLAN_CHANGED: 'subscription.plan_changed',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  TRIAL_ENDING_SOON: 'trial.ending_soon'
} as const;

// Clase para crear eventos de suscripción
export class SubscriptionEvents {
  public static subscriptionCreated(data: SubscriptionCreatedEventData): {
    eventType: string;
    eventData: SubscriptionCreatedEventData;
  } {
    return {
      eventType: SUBSCRIPTION_EVENT_TYPES.SUBSCRIPTION_CREATED,
      eventData: data
    };
  }

  public static subscriptionActivated(data: SubscriptionActivatedEventData): {
    eventType: string;
    eventData: SubscriptionActivatedEventData;
  } {
    return {
      eventType: SUBSCRIPTION_EVENT_TYPES.SUBSCRIPTION_ACTIVATED,
      eventData: data
    };
  }

  public static subscriptionCanceled(data: SubscriptionCanceledEventData): {
    eventType: string;
    eventData: SubscriptionCanceledEventData;
  } {
    return {
      eventType: SUBSCRIPTION_EVENT_TYPES.SUBSCRIPTION_CANCELED,
      eventData: data
    };
  }

  public static subscriptionPlanChanged(data: SubscriptionPlanChangedEventData): {
    eventType: string;
    eventData: SubscriptionPlanChangedEventData;
  } {
    return {
      eventType: SUBSCRIPTION_EVENT_TYPES.SUBSCRIPTION_PLAN_CHANGED,
      eventData: data
    };
  }

  public static subscriptionExpired(data: SubscriptionExpiredEventData): {
    eventType: string;
    eventData: SubscriptionExpiredEventData;
  } {
    return {
      eventType: SUBSCRIPTION_EVENT_TYPES.SUBSCRIPTION_EXPIRED,
      eventData: data
    };
  }

  public static paymentSucceeded(data: PaymentSucceededEventData): {
    eventType: string;
    eventData: PaymentSucceededEventData;
  } {
    return {
      eventType: SUBSCRIPTION_EVENT_TYPES.PAYMENT_SUCCEEDED,
      eventData: data
    };
  }

  public static paymentFailed(data: PaymentFailedEventData): {
    eventType: string;
    eventData: PaymentFailedEventData;
  } {
    return {
      eventType: SUBSCRIPTION_EVENT_TYPES.PAYMENT_FAILED,
      eventData: data
    };
  }

  public static trialEndingSoon(data: TrialEndingSoonEventData): {
    eventType: string;
    eventData: TrialEndingSoonEventData;
  } {
    return {
      eventType: SUBSCRIPTION_EVENT_TYPES.TRIAL_ENDING_SOON,
      eventData: data
    };
  }
}