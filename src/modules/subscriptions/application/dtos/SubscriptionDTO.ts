// src/modules/subscriptions/application/dtos/SubscriptionDTO.ts

// DTO para crear suscripción
export interface CreateSubscriptionDTO {
  userId: string;
  planCode: string;
  paymentMethodId?: string;
  trialDays?: number;
  couponCode?: string;
}

// DTO para actualizar suscripción
export interface UpdateSubscriptionDTO {
  subscriptionId: string;
  newPlanCode: string;
  userId: string;
}

// DTO para cancelar suscripción
export interface CancelSubscriptionDTO {
  userId: string;
  cancelImmediately?: boolean;
  reason?: string;
}

// DTO para crear sesión de checkout
export interface CreateCheckoutSessionDTO {
  userId: string;
  planCode: string;
  mode: 'subscription' | 'payment';
  trialDays?: number;
  couponCode?: string;
  successUrl: string;
  cancelUrl: string;
}

// DTO para crear portal de facturación
export interface CreateBillingPortalDTO {
  userId: string;
  returnUrl: string;
}

// DTO para procesar webhook
export interface ProcessWebhookDTO {
  payload: string;
  signature: string;
  endpointSecret: string;
}

// DTO de respuesta de suscripción
export interface SubscriptionResponseDTO {
  id: string;
  userId: string;
  planCode: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  isActive: boolean;
  isCanceled: boolean;
  isTrialing: boolean;
  trialEnd?: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// DTO de respuesta de sesión de checkout
export interface CheckoutSessionResponseDTO {
  sessionId: string;
  sessionUrl: string;
  publicKey: string;
}

// DTO de respuesta de portal de facturación
export interface BillingPortalResponseDTO {
  portalUrl: string;
}

// DTO para validación de funcionalidades
export interface FeatureAccessDTO {
  canCreateTrip: boolean;
  canUploadPhotos: boolean;
  remainingPhotos?: number;
  canUseGroupTrips: boolean;
  canUseOfflineMode: boolean;
  availableExportFormats: string[];
  upgradeRequired?: {
    feature: string;
    requiredPlan: string;
    currentPlan: string;
  };
}

// DTO para historial de facturación
export interface BillingHistoryDTO {
  invoices: {
    id: string;
    date: Date;
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'failed';
    downloadUrl?: string;
  }[];
  nextBilling?: {
    date: Date;
    amount: number;
    currency: string;
  };
}

// DTO para estadísticas de suscripciones
export interface SubscriptionStatsDTO {
  totalActive: number;
  totalCanceled: number;
  byPlan: Record<string, number>;
  growth: {
    thisMonth: number;
    lastMonth: number;
    percentageChange: number;
  };
  revenue: {
    monthly: number;
    yearly: number;
    currency: string;
  };
}

// DTO para planes disponibles
export interface PlanDetailsDTO {
  id: string;
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
  limits: {
    activeTrips: number | string;
    photosPerTrip: number | string;
    groupTripParticipants: number | string;
    exportFormats: string[];
    offlineMode: boolean;
  };
  popular?: boolean;
  stripePriceIds: {
    monthly?: string;
    yearly?: string;
  };
}