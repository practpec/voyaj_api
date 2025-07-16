// src/modules/subscriptions/domain/Subscription.ts
import { SecurityUtils } from '../../../shared/utils/SecurityUtils';

export type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING';

export interface SubscriptionData {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  priceId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}

export class Subscription {
  private data: SubscriptionData;

  constructor(subscriptionData: SubscriptionData) {
    this.data = { ...subscriptionData };
    this.validate();
  }

  // Getters
  public get id(): string {
    return this.data.id;
  }

  public get userId(): string {
    return this.data.userId;
  }

  public get planId(): string {
    return this.data.planId;
  }

  public get status(): SubscriptionStatus {
    return this.data.status;
  }

  public get stripeSubscriptionId(): string | undefined {
    return this.data.stripeSubscriptionId;
  }

  public get stripeCustomerId(): string | undefined {
    return this.data.stripeCustomerId;
  }

  public get currentPeriodEnd(): Date {
    return this.data.currentPeriodEnd;
  }

  public get isActive(): boolean {
    return this.data.status === 'ACTIVE' && 
           this.data.currentPeriodEnd > new Date() &&
           !this.data.cancelAtPeriodEnd;
  }

  public get isCanceled(): boolean {
    return this.data.status === 'CANCELED' || this.data.cancelAtPeriodEnd;
  }

  public get isTrialing(): boolean {
    return this.data.status === 'TRIALING' &&
           this.data.trialEnd &&
           this.data.trialEnd > new Date();
  }

  // Crear nueva suscripción
  public static create(
    userId: string,
    planId: string,
    stripeData?: {
      subscriptionId: string;
      customerId: string;
      priceId: string;
    }
  ): Subscription {
    const subscriptionId = SecurityUtils.generateUUID();
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const subscriptionData: SubscriptionData = {
      id: subscriptionId,
      userId,
      planId,
      status: 'INACTIVE',
      stripeSubscriptionId: stripeData?.subscriptionId,
      stripeCustomerId: stripeData?.customerId,
      priceId: stripeData?.priceId,
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      cancelAtPeriodEnd: false,
      createdAt: now
    };

    return new Subscription(subscriptionData);
  }

  // Activar suscripción
  public activate(
    stripeSubscriptionId: string,
    currentPeriodStart: Date,
    currentPeriodEnd: Date
  ): void {
    this.data.status = 'ACTIVE';
    this.data.stripeSubscriptionId = stripeSubscriptionId;
    this.data.currentPeriodStart = currentPeriodStart;
    this.data.currentPeriodEnd = currentPeriodEnd;
    this.data.cancelAtPeriodEnd = false;
    this.data.updatedAt = new Date();
  }

  // Cancelar suscripción
  public cancel(cancelAtPeriodEnd: boolean = true): void {
    this.data.cancelAtPeriodEnd = cancelAtPeriodEnd;
    this.data.canceledAt = new Date();
    this.data.updatedAt = new Date();

    if (!cancelAtPeriodEnd) {
      this.data.status = 'CANCELED';
    }
  }

  // Cambiar plan
  public changePlan(newPlanId: string, priceId?: string): void {
    this.data.planId = newPlanId;
    this.data.priceId = priceId;
    this.data.updatedAt = new Date();
  }

  // Actualizar desde webhook de Stripe
  public updateFromStripe(stripeData: {
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd?: boolean;
    trialStart?: Date;
    trialEnd?: Date;
  }): void {
    this.data.status = stripeData.status;
    this.data.currentPeriodStart = stripeData.currentPeriodStart;
    this.data.currentPeriodEnd = stripeData.currentPeriodEnd;
    
    if (stripeData.cancelAtPeriodEnd !== undefined) {
      this.data.cancelAtPeriodEnd = stripeData.cancelAtPeriodEnd;
    }
    
    if (stripeData.trialStart) {
      this.data.trialStart = stripeData.trialStart;
    }
    
    if (stripeData.trialEnd) {
      this.data.trialEnd = stripeData.trialEnd;
    }
    
    this.data.updatedAt = new Date();
  }

  private validate(): void {
    if (!this.data.id) {
      throw new Error('ID de suscripción requerido');
    }

    if (!this.data.userId) {
      throw new Error('ID de usuario requerido');
    }

    if (!this.data.planId) {
      throw new Error('ID de plan requerido');
    }
  }

  // Convertir a objeto plano para persistencia
  public toData(): SubscriptionData {
    return { ...this.data };
  }

  // Crear instancia desde datos existentes
  public static fromData(subscriptionData: SubscriptionData): Subscription {
    return new Subscription(subscriptionData);
  }
}