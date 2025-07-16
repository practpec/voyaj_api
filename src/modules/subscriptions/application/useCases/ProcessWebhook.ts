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
    if (invoice.subscription) {
      const subscription = await this.subscriptionRepository.findByStripeSubscriptionId(
        invoice.subscription as string
      );

      if (subscription) {
        // Reactivar suscripción si estaba en past_due
        if (subscription.status === 'PAST_DUE') {
          subscription.updateFromStripe({
            status: 'ACTIVE',
            currentPeriodStart: subscription.data.currentPeriodStart,
            currentPeriodEnd: subscription.data.currentPeriodEnd
          });
          await this.subscriptionRepository.update(subscription);
        }

        // Publicar evento de pago exitoso
        const event = SubscriptionEvents.paymentSucceeded({
          subscriptionId: subscription.id,
          userId: subscription.userId,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          paidAt: new Date(invoice.created * 1000),
          invoiceId: invoice.id
        });

        await this.eventBus.publishTripEvent(event.eventType, subscription.id, event.eventData);

        this.logger.info(`Pago exitoso para suscripción: ${subscription.id}`);
      }
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (invoice.subscription) {
      const subscription = await this.subscriptionRepository.findByStripeSubscriptionId(
        invoice.subscription as string
      );

      if (subscription) {
        subscription.updateFromStripe({
          status: 'PAST_DUE',
          currentPeriodStart: subscription.data.currentPeriodStart,
          currentPeriodEnd: subscription.data.currentPeriodEnd
        });
        await this.subscriptionRepository.update(subscription);

        // Publicar evento de pago fallido
        const event = SubscriptionEvents.paymentFailed({
          subscriptionId: subscription.id,
          userId: subscription.userId,
          amount: invoice.amount_due,
          currency: invoice.currency,
          failedAt: new Date(invoice.created * 1000),
          reason: 'Payment failed',
          attemptCount: invoice.attempt_count || 1
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
      const daysRemaining = subscription.data.trialEnd ? 
        Math.ceil((subscription.data.trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

      const event = SubscriptionEvents.trialEndingSoon({
        subscriptionId: subscription.id,
        userId: subscription.userId,
        planCode: 'PLAN_CODE', // Necesitaríamos obtener el plan
        trialEndDate: subscription.data.trialEnd!,
        daysRemaining
      });

      await this.eventBus.publishTripEvent(event.eventType, subscription.id, event.eventData);

      this.logger.info(`Trial terminará pronto para suscripción: ${subscription.id}`);
    }
  }

  private updateSubscriptionFromStripe(subscription: any, stripeSubscription: Stripe.Subscription): void {
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
}