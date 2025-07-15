// src/shared/constants/paymentConstants.ts

// Enum de planes
export const PLANS = {
  EXPLORADOR: 'explorador',
  AVENTURERO: 'aventurero', 
  NOMADA: 'nomada'
} as const;

// Límites por plan
export const PLAN_LIMITS = {
  explorador: {
    activeTrips: 1,
    photosPerTrip: 100,
    groupTripParticipants: 0,
    exportFormats: [],
    offlineMode: false,
    price: 0, // Gratis
    priceId: null, // No tiene precio en Stripe
    currency: 'MXN'
  },
  aventurero: {
    activeTrips: -1, // ilimitado
    photosPerTrip: -1, // ilimitado  
    groupTripParticipants: 10,
    exportFormats: ['pdf', 'excel'],
    offlineMode: true,
    price: 999, // $9.99 MXN (en centavos)
    priceId: 'price_aventurero_monthly', // Se configura en Stripe Dashboard
    currency: 'MXN'
  },
  nomada: {
    activeTrips: -1,
    photosPerTrip: -1,
    groupTripParticipants: -1, // ilimitado
    exportFormats: ['pdf', 'excel', 'advanced-pdf'],
    offlineMode: true,
    price: 1999, // $19.99 MXN (en centavos)
    priceId: 'price_nomada_monthly', // Se configura en Stripe Dashboard
    currency: 'MXN'
  }
} as const;

// Estados de suscripción
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  CANCELED: 'canceled',
  PAST_DUE: 'past_due',
  TRIALING: 'trialing'
} as const;

// Estados de pago
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELED: 'canceled'
} as const;

// Configuración de Stripe
export const STRIPE_CONFIG = {
  API_VERSION: '2023-10-16' as const,
  WEBHOOK_TOLERANCE: 300, // 5 minutos
  CURRENCY: 'MXN' as const
} as const;