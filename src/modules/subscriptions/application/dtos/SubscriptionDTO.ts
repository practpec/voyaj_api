// src/modules/subscriptions/application/dtos/SubscriptionDTO.ts

// DTO para crear suscripción
export interface CreateSubscriptionDTO {
  userId: string;
  plan: 'EXPLORADOR' | 'AVENTURERO' | 'EXPEDICIONARIO';
  paymentMethodId?: string;
  trialDays?: number;
  couponCode?: string;
}

// DTO para actualizar suscripción (cambio de plan)
export interface UpdateSubscriptionDTO {
  subscriptionId: string;
  newPlan: 'EXPLORADOR' | 'AVENTURERO' | 'EXPEDICIONARIO';
  prorationBehavior?: 'none' | 'create_prorations' | 'always_invoice';
}

// DTO para crear sesión de checkout
export interface CreateCheckoutSessionDTO {
  userId: string;
  plan: 'AVENTURERO' | 'EXPEDICIONARIO';
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

// DTO de respuesta de suscripción
export interface SubscriptionResponseDTO {
  id: string;
  userId: string;
  plan: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  isActive: boolean;
  isCanceled: boolean;
  isTrialing: boolean;
  trialEnd?: Date;
  planLimits: {
    activeTrips: number | string;
    photosPerTrip: number | string;
    groupTripParticipants: number | string;
    exportFormats: string[];
    offlineMode: boolean;
  };
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
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

// DTO para planes disponibles
export interface PlanDetailsDTO {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
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
    monthly: string;
    yearly: string;
  };
}

// DTO para estadísticas de suscripciones
export interface SubscriptionStatsDTO {
  totalActive: number;
  totalCanceled: number;
  byPlan: {
    EXPLORADOR: number;
    AVENTURERO: number;
    EXPEDICIONARIO: number;
  };
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