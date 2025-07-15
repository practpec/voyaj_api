// src/modules/subscriptions/index.ts

// Domain exports
export { Subscription, SubscriptionPlan, SubscriptionStatus } from './domain/Subscription';
export { SubscriptionService } from './domain/SubscriptionService';
export { SubscriptionEvents, SUBSCRIPTION_EVENT_TYPES } from './domain/SubscriptionEvents';
export { ISubscriptionRepository } from './domain/interfaces/ISubscriptionRepository';

// Application exports
export { CreateSubscriptionUseCase } from './application/useCases/CreateSubscription';
export { UpdateSubscriptionUseCase } from './application/useCases/UpdateSubscription';
export { CancelSubscriptionUseCase } from './application/useCases/CancelSubscription';
export { GetSubscriptionUseCase } from './application/useCases/GetSubscription';
export { ProcessWebhookUseCase } from './application/useCases/ProcessWebhook';
export { GetAvailablePlansUseCase } from './application/useCases/GetAvailablePlans';

// DTOs
export {
  CreateSubscriptionDTO,
  UpdateSubscriptionDTO,
  CreateCheckoutSessionDTO,
  CreateBillingPortalDTO,
  SubscriptionResponseDTO,
  CheckoutSessionResponseDTO,
  BillingPortalResponseDTO,
  PlanDetailsDTO,
  SubscriptionStatsDTO,
  FeatureAccessDTO,
  BillingHistoryDTO
} from './application/dtos/SubscriptionDTO';

// Infrastructure exports
export { SubscriptionController } from './infrastructure/controllers/SubscriptionController';
export { WebhookController } from './infrastructure/controllers/WebhookController';
export { SubscriptionMongoRepository } from './infrastructure/repositories/SubscriptionMongoRepository';
export { StripeService } from './infrastructure/services/StripeService';
export { NotificationService } from './infrastructure/services/NotificationService';
export { SubscriptionValidationService } from './infrastructure/services/SubscriptionValidationService';
export { SubscriptionMiddleware } from './infrastructure/middleware/SubscriptionMiddleware';
export { SubscriptionEventHandlers } from './infrastructure/events/SubscriptionEventHandlers';
export { SubscriptionRoutes } from './infrastructure/routes/SubscriptionRoutes';

// Module configuration
export class SubscriptionModule {
  public static async initialize() {
    // Aquí se puede agregar lógica de inicialización del módulo
    // como registro de eventos, configuración de dependencias, etc.
    console.log('Subscription module initialized');
  }
}