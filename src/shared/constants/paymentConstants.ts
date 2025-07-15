// src/shared/constants/paymentConstants.ts

// Enum de planes
export const PLANS = {
  EXPLORADOR: 'EXPLORADOR',
  AVENTURERO: 'AVENTURERO', 
  NOMADA: 'NOMADA'
} as const;

// Límites por plan
export const PLAN_LIMITS = {
  EXPLORADOR: {
    activeTrips: 1,
    photosPerTrip: 100,
    groupTripParticipants: 0,
    exportFormats: [],
    offlineMode: false,
    price: 0, // Gratis
    priceId: null, // No tiene precio en Stripe
    currency: 'MXN'
  },
  AVENTURERO: {
    activeTrips: -1, // ilimitado
    photosPerTrip: -1, // ilimitado  
    groupTripParticipants: 10,
    exportFormats: ['pdf', 'excel'],
    offlineMode: true,
    price: 999, // $9.99 MXN (en centavos)
    priceId: process.env.STRIPE_PRICE_AVENTURERO_MONTHLY || 'price_aventurero_monthly',
    currency: 'MXN'
  },
  NOMADA: {
    activeTrips: -1,
    photosPerTrip: -1,
    groupTripParticipants: -1, // ilimitado
    exportFormats: ['pdf', 'excel', 'advanced-pdf'],
    offlineMode: true,
    price: 1999, // $19.99 MXN (en centavos)
    priceId: process.env.STRIPE_PRICE_NOMADA_MONTHLY || 'price_nomada_monthly',
    currency: 'MXN'
  }
} as const;

// Estados de suscripción
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  CANCELED: 'CANCELED',
  PAST_DUE: 'PAST_DUE',
  TRIALING: 'TRIALING'
} as const;

// Estados de pago
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED'
} as const;

// Configuración de Stripe
export const STRIPE_CONFIG = {
  API_VERSION: '2023-10-16' as const,
  WEBHOOK_TOLERANCE: 300, // 5 minutos
  CURRENCY: 'MXN' as const
} as const;