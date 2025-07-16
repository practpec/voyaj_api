// src/modules/subscriptions/application/useCases/UpdateSubscription.ts
import { ISubscriptionRepository } from '../../domain/interfaces/ISubscriptionRepository';
import { IPlanRepository } from '../../domain/interfaces/IPlanRepository';
import { StripeService } from '../../infrastructure/services/StripeService';
import { SubscriptionEvents } from '../../domain/SubscriptionEvents';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { UpdateSubscriptionDTO } from '../dtos/SubscriptionDTO';

export class UpdateSubscriptionUseCase {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private planRepository: IPlanRepository,
    private stripeService: StripeService,
    private eventBus: EventBus,
    private logger: LoggerService
  ) {}

  public async execute(dto: UpdateSubscriptionDTO): Promise<void> {
    try {
      // Validar datos de entrada
      this.validateInput(dto);

      // Obtener suscripción
      const subscription = await this.subscriptionRepository.findById(dto.subscriptionId);
      
      if (!subscription) {
        throw new Error('Suscripción no encontrada');
      }

      if (subscription.userId !== dto.userId) {
        throw new Error('No tienes permisos para modificar esta suscripción');
      }

      // Obtener plan actual y nuevo plan
      const [currentPlan, newPlan] = await Promise.all([
        this.planRepository.findById(subscription.planId),
        this.planRepository.findByCode(dto.newPlanCode)
      ]);

      if (!currentPlan || !newPlan) {
        throw new Error('Plan no encontrado');
      }

      // Validar que el plan sea diferente
      if (currentPlan.code === newPlan.code) {
        throw new Error('Ya tienes este plan activo');
      }

      // Si es cambio a plan gratuito, cancelar suscripción
      if (newPlan.isFree) {
        await this.downgradeTo

(newPlan, subscription);
        return;
      }

      // Para planes pagos, usar Stripe
      if (!subscription.stripeSubscriptionId) {
        throw new Error('Suscripción sin ID de Stripe válido');
      }

      if (!newPlan.stripePriceIdMonthly) {
        throw new Error('Nuevo plan sin precio configurado');
      }

      await this.stripeService.changePlan(subscription.stripeSubscriptionId, newPlan.stripePriceIdMonthly);

      // Actualizar plan en nuestra BD
      subscription.changePlan(newPlan.id, newPlan.stripePriceIdMonthly);
      await this.subscriptionRepository.update(subscription);

      // Publicar evento
      const event = SubscriptionEvents.subscriptionPlanChanged({
        subscriptionId: subscription.id,
        userId: subscription.userId,
        oldPlanCode: currentPlan.code,
        newPlanCode: newPlan.code,
        changedAt: new Date()
      });

      await this.eventBus.publishTripEvent(event.eventType, subscription.id, event.eventData);

      this.logger.info(`Plan cambiado exitosamente: ${dto.subscriptionId} de ${currentPlan.code} a ${newPlan.code}`);

    } catch (error) {
      this.logger.error(`Error actualizando suscripción ${dto.subscriptionId}:`, error);
      throw error;
    }
  }

  private async downgradeToFree(newPlan: any, subscription: any): Promise<void> {
    // Cancelar suscripción actual en Stripe si existe
    if (subscription.stripeSubscriptionId) {
      await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId, false);
    }

    // Cambiar a plan gratuito
    subscription.changePlan(newPlan.id);
    subscription.cancel(false); // Cancelar inmediatamente
    await this.subscriptionRepository.update(subscription);

    this.logger.info(`Suscripción cambiada a plan gratuito: ${subscription.id}`);
  }

  private validateInput(dto: UpdateSubscriptionDTO): void {
    if (!dto.subscriptionId) {
      throw ErrorHandler.createValidationError('ID de suscripción requerido');
    }

    if (!dto.userId) {
      throw ErrorHandler.createValidationError('ID de usuario requerido');
    }

    if (!dto.newPlanCode) {
      throw ErrorHandler.createValidationError('Nuevo código de plan requerido');
    }
  }
}