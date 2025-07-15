// src/modules/subscriptions/application/useCases/CreateSubscription.ts
import { ISubscriptionRepository } from '../../domain/interfaces/ISubscriptionRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { StripeService } from '../../infrastructure/services/StripeService';
import { Subscription } from '../../domain/Subscription';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { PLANS, PLAN_LIMITS } from '../../../../shared/constants/paymentConstants';

export interface CreateSubscriptionDTO {
  userId: string;
  plan: keyof typeof PLANS;
  trialDays?: number;
}

export interface CreateSubscriptionResponse {
  subscription: {
    id: string;
    plan: string;
    status: string;
    currentPeriodEnd: Date;
  };
  paymentIntent?: {
    clientSecret: string;
    status: string;
  };
  requiresPayment: boolean;
}

export class CreateSubscriptionUseCase {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private userRepository: IUserRepository,
    private stripeService: StripeService,
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

      // Verificar si ya tiene suscripción activa
      const existingSubscription = await this.subscriptionRepository.findActiveByUserId(dto.userId);
      if (existingSubscription && existingSubscription.isActive) {
        throw new Error('El usuario ya tiene una suscripción activa');
      }

      // Si es plan gratuito, crear suscripción directamente
      if (dto.plan === 'EXPLORADOR') {
        return await this.createFreeSubscription(dto);
      }

      // Para planes pagos, usar Stripe
      return await this.createPaidSubscription(dto, user);

    } catch (error) {
      this.logger.error(`Error creando suscripción para usuario ${dto.userId}:`, error);
      throw error;
    }
  }

  private async createFreeSubscription(dto: CreateSubscriptionDTO): Promise<CreateSubscriptionResponse> {
    // Crear suscripción gratuita
    const subscription = Subscription.create(dto.userId, dto.plan);
    
    // Guardar en base de datos
    await this.subscriptionRepository.create(subscription);

    this.logger.info(`Suscripción gratuita creada para usuario: ${dto.userId}`);

    return {
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd
      },
      requiresPayment: false
    };
  }

  private async createPaidSubscription(dto: CreateSubscriptionDTO, user: any): Promise<CreateSubscriptionResponse> {
    const planConfig = PLAN_LIMITS[dto.plan];
    
    if (!planConfig.priceId) {
      throw new Error(`Plan ${dto.plan} no tiene precio configurado`);
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
      planConfig.priceId,
      dto.trialDays
    );

    // Crear suscripción en nuestra BD
    const subscription = Subscription.create(dto.userId, dto.plan, {
      subscriptionId: stripeSubscription.id,
      customerId: customer.id,
      priceId: planConfig.priceId
    });

    // Actualizar estado basado en Stripe
    this.updateSubscriptionFromStripe(subscription, stripeSubscription);

    // Guardar en base de datos
    await this.subscriptionRepository.create(subscription);

    this.logger.info(`Suscripción paga creada para usuario: ${dto.userId}, plan: ${dto.plan}`);

    // Preparar respuesta
    const response: CreateSubscriptionResponse = {
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd
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

  private mapStripeStatus(stripeStatus: string): keyof typeof import('../../../../shared/constants/paymentConstants').SUBSCRIPTION_STATUS {
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

    if (!Object.values(PLANS).includes(dto.plan)) {
      throw ErrorHandler.createValidationError('Plan inválido');
    }

    if (dto.trialDays && (dto.trialDays < 0 || dto.trialDays > 30)) {
      throw ErrorHandler.createValidationError('Días de trial debe estar entre 0 y 30');
    }
  }
}