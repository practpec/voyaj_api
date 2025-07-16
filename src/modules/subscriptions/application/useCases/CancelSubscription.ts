// src/modules/subscriptions/application/useCases/CancelSubscription.ts
import { ISubscriptionRepository } from '../../domain/interfaces/ISubscriptionRepository';
import { IPlanRepository } from '../../domain/interfaces/IPlanRepository';
import { StripeService } from '../../infrastructure/services/StripeService';
import { SubscriptionEvents } from '../../domain/SubscriptionEvents';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { CancelSubscriptionDTO } from '../dtos/SubscriptionDTO';

export class CancelSubscriptionUseCase {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private stripeService: StripeService,
    private eventBus: EventBus,
    private logger: LoggerService
  ) {}

  public async execute(dto: CancelSubscriptionDTO): Promise<void> {
    try {
      // Validar datos de entrada
      this.validateInput(dto);

      // Obtener suscripción activa del usuario
      const subscription = await this.subscriptionRepository.findActiveByUserId(dto.userId);
      
      if (!subscription) {
        throw new Error('No tienes una suscripción activa para cancelar');
      }

      if (subscription.isCanceled) {
        throw new Error('La suscripción ya está cancelada');
      }

      // Para planes pagos, cancelar en Stripe
      if (subscription.stripeSubscriptionId) {
        await this.stripeService.cancelSubscription(
          subscription.stripeSubscriptionId,
          !dto.cancelImmediately
        );
      }

      // Actualizar suscripción local
      subscription.cancel(!dto.cancelImmediately);
      await this.subscriptionRepository.update(subscription);

      // Publicar evento
      const event = SubscriptionEvents.subscriptionCanceled({
        subscriptionId: subscription.id,
        userId: subscription.userId,
        planCode: 'PLAN_CODE', // Necesitaríamos obtener el plan para esto
        canceledAt: new Date(),
        cancelAtPeriodEnd: !dto.cancelImmediately,
        reason: dto.reason
      });

      await this.eventBus.publishTripEvent(event.eventType, subscription.id, event.eventData);

      this.logger.info(`Suscripción cancelada para usuario: ${dto.userId}, inmediata: ${dto.cancelImmediately}`);

    } catch (error) {
      this.logger.error(`Error cancelando suscripción para usuario ${dto.userId}:`, error);
      throw error;
    }
  }

  private validateInput(dto: CancelSubscriptionDTO): void {
    if (!dto.userId) {
      throw ErrorHandler.createValidationError('ID de usuario requerido');
    }
  }
}