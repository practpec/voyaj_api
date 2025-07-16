// src/modules/subscriptions/application/useCases/CreateSubscription.ts
import { ISubscriptionRepository } from '../../domain/interfaces/ISubscriptionRepository';
import { IPlanRepository } from '../../domain/interfaces/IPlanRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { StripeService } from '../../infrastructure/services/StripeService';
import { Subscription } from '../../domain/Subscription';
import { SubscriptionEvents } from '../../domain/SubscriptionEvents';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { CreateSubscriptionDTO, SubscriptionResponseDTO } from '../dtos/SubscriptionDTO';

export interface CreateSubscriptionResponse {
  subscription: SubscriptionResponseDTO;
  paymentIntent?: {
    clientSecret: string;
    status: string;
  };
  requiresPayment: boolean;
}

export class CreateSubscriptionUseCase {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private planRepository: IPlanRepository,
    private userRepository: IUserRepository,
    private stripeService: StripeService,
    private eventBus: EventBus,
    private logger: LoggerService
  ) {}

  public async execute(dto: CreateSubscriptionDTO): Promise<CreateSubscriptionResponse> {
    try {
      // Validar datos de entrada
      this.validateInput(dto);

      // Obtener usuario
      const user = await this.userRepository.findById(dto.userId);
      if (!user || user.isDeleted) {
        throw ErrorHandler.createUserNotFoundError();
      }

      // Obtener plan
      const plan = await this.planRepository.findByCode(dto.planCode);
      if (!plan || !plan.isActive) {
        throw new Error('Plan no encontrado o no activo');
      }

      // Verificar si ya tiene suscripción activa
      const existingSubscription = await this.subscriptionRepository.findActiveByUserId(dto.userId);
      if (existingSubscription && existingSubscription.isActive) {
        throw new Error('El usuario ya tiene una suscripción activa');
      }

      // Si es plan gratuito, crear suscripción directamente
      if (plan.isFree) {
        return await this.createFreeSubscription(dto, plan);
      }

      // Para planes pagos, usar Stripe
      return await this.createPaidSubscription(dto, user, plan);

    } catch (error) {
      this.logger.error(`Error creando suscripción para usuario ${dto.userId}:`, error);
      throw error;
    }
  }

  private async createFreeSubscription(dto: CreateSubscriptionDTO, plan: any): Promise<CreateSubscriptionResponse> {
    // Crear suscripción gratuita
    const subscription = Subscription.create(dto.userId, plan.id);
    subscription.activate('', new Date(), new Date('2099-12-31'));
    
    // Guardar en base de datos
    await this.subscriptionRepository.create(subscription);

    // Publicar evento
    const event = SubscriptionEvents.subscriptionCreated({
      subscriptionId: subscription.id,
      userId: subscription.userId,
      planCode: plan.code,
      status: subscription.status,
      createdAt: new Date()
    });

    await this.eventBus.publishTripEvent(event.eventType, subscription.id, event.eventData);

    this.logger.info(`Suscripción gratuita creada para usuario: ${dto.userId}`);

    return {
      subscription: {
        id: subscription.id,
        userId: subscription.userId,
        planCode: plan.code,
        status: subscription.status,
        currentPeriodStart: subscription.data.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.data.cancelAtPeriodEnd,
        isActive: subscription.isActive,
        isCanceled: subscription.isCanceled,
        isTrialing: subscription.isTrialing,
        createdAt: subscription.data.createdAt
      },
      requiresPayment: false
    };
  }

  private async createPaidSubscription(dto: CreateSubscriptionDTO, user: any, plan: any): Promise<CreateSubscriptionResponse> {
    if (!plan.stripePriceIdMonthly) {
      throw new Error(`Plan ${plan.code} no tiene precio configurado`);
    }

    // Crear o obtener customer en Stripe
    const customer = await this.stripeService.createOrGetCustomer(
      dto.userId,
      user.email,
      user.name
    );

    // Crear suscripción en Stripe
    const stripeSubscription = await this.stripeService.createSubscription(
      customer.id,
      plan.stripePriceIdMonthly,
      dto.trialDays
    );

    // Crear suscripción en nuestra BD
    const subscription = Subscription.create(dto.userId, plan.id, {
      subscriptionId: stripeSubscription.id,
      customerId: customer.id,
      priceId: plan.stripePriceIdMonthly
    });

    // Actualizar estado basado en Stripe
    this.updateSubscriptionFromStripe(subscription, stripeSubscription);

    // Guardar en base de datos
    await this.subscriptionRepository.create(subscription);

    // Publicar evento
    const event = SubscriptionEvents.subscriptionCreated({
      subscriptionId: subscription.id,
      userId: subscription.userId,
      planCode: plan.code,
      status: subscription.status,
      createdAt: new Date(),
      stripeSubscriptionId: stripeSubscription.id
    });

    await this.eventBus.publishTripEvent(event.eventType, subscription.id, event.eventData);

    this.logger.info(`Suscripción paga creada para usuario: ${dto.userId}, plan: ${plan.code}`);

    // Preparar respuesta
    const response: CreateSubscriptionResponse = {
      subscription: {
        id: subscription.id,
        userId: subscription.userId,
        planCode: plan.code,
        status: subscription.status,
        currentPeriodStart: subscription.data.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.data.cancelAtPeriodEnd,
        isActive: subscription.isActive,
        isCanceled: subscription.isCanceled,
        isTrialing: subscription.isTrialing,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        stripeCustomerId: subscription.stripeCustomerId,
        createdAt: subscription.data.createdAt
      },
      requiresPayment: true
    };

    // Si hay payment intent, incluir client secret
    if (stripeSubscription.latest_invoice) {
      const invoice = stripeSubscription.latest_invoice as any;
      if (invoice.payment_intent) {
        response.paymentIntent = {
          clientSecret: invoice.payment_intent.client_secret,
          status: invoice.payment_intent.status
        };
      }
    }

    return response;
  }

  private updateSubscriptionFromStripe(subscription: Subscription, stripeSubscription: any): void {
    const status = this.mapStripeStatus(stripeSubscription.status);
    
    subscription.updateFromStripe({
      status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      trialStart: stripeSubscription.trial_start ? 
        new Date(stripeSubscription.trial_start * 1000) : undefined,
      trialEnd: stripeSubscription.trial_end ? 
        new Date(stripeSubscription.trial_end * 1000) : undefined
    });
  }

  private mapStripeStatus(stripeStatus: string): any {
    switch (stripeStatus) {
      case 'active':
        return 'ACTIVE';
      case 'trialing':
        return 'TRIALING';
      case 'canceled':
      case 'cancelled':
        return 'CANCELED';
      case 'past_due':
        return 'PAST_DUE';
      default:
        return 'INACTIVE';
    }
  }

  private validateInput(dto: CreateSubscriptionDTO): void {
    if (!dto.userId) {
      throw ErrorHandler.createValidationError('ID de usuario requerido');
    }

    if (!dto.planCode) {
      throw ErrorHandler.createValidationError('Código de plan requerido');
    }

    if (dto.trialDays && (dto.trialDays < 0 || dto.trialDays > 30)) {
      throw ErrorHandler.createValidationError('Días de trial debe estar entre 0 y 30');
    }
  }
}