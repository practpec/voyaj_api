// src/modules/subscriptions/application/useCases/ProcessWebhook.ts
import { ISubscriptionRepository } from '../../domain/interfaces/ISubscriptionRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { StripeService } from '../../infrastructure/services/StripeService';
import { SubscriptionEvents } from '../../domain/SubscriptionEvents';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ProcessWebhookDTO } from '../dtos/SubscriptionDTO';
import Stripe from 'stripe';

export class ProcessWebhookUseCase {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private userRepository: IUserRepository,
    private stripeService: StripeService,
    private eventBus: EventBus,
    private logger: LoggerService
  ) {}

  public async execute(dto: ProcessWebhookDTO): Promise<void> {
    try {
      // Verificar y construir evento de Stripe
      const event = this.stripeService.verifyWebhookSignature(
        dto.payload,
        dto.signature,
        dto.endpointSecret
      );

      this.logger.info(`Procesando webhook de Stripe: ${event.type}`, {
        eventId: event.id,
        type: event.type
      });

      // Procesar según el tipo de evento
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;

        default:
          this.logger.debug(`Evento de webhook no manejado: ${event.type}`);
      }

    } catch (error) {
      this.logger.error('Error procesando webhook de Stripe:', error);
      throw error;
    }
  }

  private async handleSubscriptionCreated(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findByStripeSubscriptionId(
      stripeSubscription.id
    );

    if (subscription) {
      this.updateSubscriptionFromStripe(subscription, stripeSubscription);
      await this.subscriptionRepository.update(subscription);
      
      this.logger.info(`Suscripción actualizada desde webhook: ${subscription.id}`);
    } else {
      this.logger.warn(`Suscripción no encontrada para ID de Stripe: ${stripeSubscription.id}`);
    }
  }

  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findByStripeSubscriptionId(
      stripeSubscription.id
    );

    if (subscription) {
      this.updateSubscriptionFromStripe(subscription, stripeSubscription);
      await this.subscriptionRepository.update(subscription);
      
      this.logger.info(`Suscripción actualizada desde webhook: ${subscription.id}`);
    }
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findByStripeSubscriptionId(
      stripeSubscription.id
    );

    if (subscription) {
      subscription.cancel(true);
      await this.subscriptionRepository.update(subscription);
      
      this.logger.info(`Suscripción cancelada desde webhook: ${subscription.id}`);
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Verificar si la factura tiene suscripción asociada
    const subscriptionId = (invoice as any).subscription;
    if (subscriptionId && typeof subscriptionId === 'string') {
      const subscription = await this.subscriptionRepository.findByStripeSubscriptionId(
        subscriptionId
      );

      if (subscription) {
        // Reactivar suscripción si estaba en past_due
        if (subscription.status === 'PAST_DUE') {
          subscription.updateFromStripe({
            status: 'ACTIVE',
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd
          });
          await this.subscriptionRepository.update(subscription);
        }

        // Publicar evento de pago exitoso
        const event = SubscriptionEvents.paymentSucceeded({
          subscriptionId: subscription.id,
          userId: subscription.userId,
          amount: invoice.amount_paid || 0,
          currency: invoice.currency || 'usd',
          paidAt: new Date((invoice.created || Date.now() / 1000) * 1000),
          invoiceId: invoice.id
        });

        await this.eventBus.publishTripEvent(event.eventType, subscription.id, event.eventData);

        this.logger.info(`Pago exitoso para suscripción: ${subscription.id}`);
      }
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Verificar si la factura tiene suscripción asociada
    const subscriptionId = (invoice as any).subscription;
    if (subscriptionId && typeof subscriptionId === 'string') {
      const subscription = await this.subscriptionRepository.findByStripeSubscriptionId(
        subscriptionId
      );

      if (subscription) {
        subscription.updateFromStripe({
          status: 'PAST_DUE',
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd
        });
        await this.subscriptionRepository.update(subscription);

        // Publicar evento de pago fallido
        const event = SubscriptionEvents.paymentFailed({
          subscriptionId: subscription.id,
          userId: subscription.userId,
          amount: invoice.amount_due || 0,
          currency: invoice.currency || 'usd',
          failedAt: new Date((invoice.created || Date.now() / 1000) * 1000),
          reason: 'Payment failed',
          attemptCount: (invoice as any).attempt_count || 1
        });

        await this.eventBus.publishTripEvent(event.eventType, subscription.id, event.eventData);

        this.logger.warn(`Pago fallido para suscripción: ${subscription.id}`);
      }
    }
  }

  private async handleTrialWillEnd(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findByStripeSubscriptionId(
      stripeSubscription.id
    );

    if (subscription) {
      // Publicar evento de trial próximo a expirar
      const daysRemaining = subscription.trialEnd ? 
        Math.ceil((subscription.trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

      const event = SubscriptionEvents.trialEndingSoon({
        subscriptionId: subscription.id,
        userId: subscription.userId,
        planCode: 'PLAN_CODE', // Necesitaríamos obtener el plan
        trialEndDate: subscription.trialEnd!,
        daysRemaining
      });

      await this.eventBus.publishTripEvent(event.eventType, subscription.id, event.eventData);

      this.logger.info(`Trial terminará pronto para suscripción: ${subscription.id}`);
    }
  }

  private updateSubscriptionFromStripe(subscription: any, stripeSubscription: Stripe.Subscription): void {
    const status = this.mapStripeStatus(stripeSubscription.status);
    
    // Usar any para acceder a propiedades que pueden no estar tipadas correctamente
    const stripeAny = stripeSubscription as any;
    
    subscription.updateFromStripe({
      status,
      currentPeriodStart: new Date((stripeAny.current_period_start || 0) * 1000),
      currentPeriodEnd: new Date((stripeAny.current_period_end || 0) * 1000),
      cancelAtPeriodEnd: stripeAny.cancel_at_period_end || false,
      trialStart: stripeAny.trial_start ? 
        new Date(stripeAny.trial_start * 1000) : undefined,
      trialEnd: stripeAny.trial_end ? 
        new Date(stripeAny.trial_end * 1000) : undefined
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
}