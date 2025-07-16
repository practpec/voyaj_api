// src/modules/subscriptions/index.ts

// Domain exports
export { Subscription } from './domain/Subscription';
export { Plan } from './domain/Plan';
export { SubscriptionService } from './domain/SubscriptionService';
export { SubscriptionEvents, SUBSCRIPTION_EVENT_TYPES } from './domain/SubscriptionEvents';
export { ISubscriptionRepository } from './domain/interfaces/ISubscriptionRepository';
export { IPlanRepository } from './domain/interfaces/IPlanRepository';

// Application exports
export { CreateSubscriptionUseCase } from './application/useCases/CreateSubscription';
export { UpdateSubscriptionUseCase } from './application/useCases/UpdateSubscription';
export { CancelSubscriptionUseCase } from './application/useCases/CancelSubscription';
export { GetSubscriptionUseCase } from './application/useCases/GetSubscription';
export { GetAvailablePlansUseCase } from './application/useCases/GetAvailablePlans';
export { ProcessWebhookUseCase } from './application/useCases/ProcessWebhook';
export { ValidateFeatureAccessUseCase } from './application/useCases/ValidateFeatureAccess';

// DTOs
export {
  CreateSubscriptionDTO,
  UpdateSubscriptionDTO,
  CancelSubscriptionDTO,
  CreateCheckoutSessionDTO,
  CreateBillingPortalDTO,
  ProcessWebhookDTO,
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
export { PlanMongoRepository } from './infrastructure/repositories/PlanMongoRepository';
export { StripeService } from './infrastructure/services/StripeService';
export { SubscriptionMiddleware } from './infrastructure/middleware/SubscriptionMiddleware';
export { subscriptionRoutes } from './infrastructure/routes/subscriptionRoutes';

// Seeds
export { PlansSeedService } from './infrastructure/seeds/plansSeed';

// Module configuration
export class SubscriptionModule {
  public static async initialize(): Promise<void> {
    // Inicializar seed de planes si es necesario
    if (process.env.SEED_PLANS === 'true') {
      const plansSeedService = new PlansSeedService();
      await plansSeedService.seedPlans();
    }
  }
}