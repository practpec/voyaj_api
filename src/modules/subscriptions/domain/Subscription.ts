// src/modules/subscriptions/domain/Subscription.ts
import { SecurityUtils } from '../../../shared/utils/SecurityUtils';
import { PLANS, PLAN_LIMITS, SUBSCRIPTION_STATUS } from '../../../shared/constants/paymentConstants';

export interface SubscriptionData {
  id: string;
  userId: string;
  plan: keyof typeof PLANS;
  status: keyof typeof SUBSCRIPTION_STATUS;
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

  public get plan(): keyof typeof PLANS {
    return this.data.plan;
  }

  public get status(): keyof typeof SUBSCRIPTION_STATUS {
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

  public get planLimits() {
    return PLAN_LIMITS[this.data.plan];
  }

  // Crear nueva suscripción
  public static create(
    userId: string,
    plan: keyof typeof PLANS,
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
      plan,
      status: plan === 'EXPLORADOR' ? 'ACTIVE' : 'INACTIVE',
      stripeSubscriptionId: stripeData?.subscriptionId,
      stripeCustomerId: stripeData?.customerId,
      priceId: stripeData?.priceId,
      currentPeriodStart: now,
      currentPeriodEnd: plan === 'EXPLORADOR' ? new Date('2099-12-31') : nextMonth,
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
  public changePlan(newPlan: keyof typeof PLANS, priceId?: string): void {
    this.data.plan = newPlan;
    this.data.priceId = priceId;
    this.data.updatedAt = new Date();
  }

  // Actualizar desde webhook de Stripe
  public updateFromStripe(stripeData: {
    status: keyof typeof SUBSCRIPTION_STATUS;
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

  // Verificar si puede acceder a una característica
  public canAccess(feature: string): boolean {
    if (!this.isActive && this.data.plan !== 'EXPLORADOR') {
      return false;
    }

    const limits = this.planLimits;
    
    switch (feature) {
      case 'unlimited_trips':
        return limits.activeTrips === -1;
      case 'group_trips':
        return limits.groupTripParticipants > 0;
      case 'offline_mode':
        return limits.offlineMode;
      case 'export_pdf':
        return limits.exportFormats.includes('pdf');
      case 'export_excel':
        return limits.exportFormats.includes('excel');
      default:
        return true;
    }
  }

  // Obtener límite específico
  public getLimit(limitType: keyof typeof PLAN_LIMITS.explorador): number | boolean | string[] {
    return this.planLimits[limitType];
  }

  private validate(): void {
    if (!this.data.id) {
      throw new Error('ID de suscripción requerido');
    }

    if (!this.data.userId) {
      throw new Error('ID de usuario requerido');
    }

    if (!Object.values(PLANS).includes(this.data.plan)) {
      throw new Error('Plan inválido');
    }

    if (!Object.values(SUBSCRIPTION_STATUS).includes(this.data.status)) {
      throw new Error('Estado de suscripción inválido');
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