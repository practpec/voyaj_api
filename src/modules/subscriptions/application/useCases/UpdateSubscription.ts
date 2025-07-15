// src/modules/subscriptions/application/useCases/UpdateSubscription.ts
import { ISubscriptionRepository } from '../../domain/interfaces/ISubscriptionRepository';
import { StripeService } from '../../infrastructure/services/StripeService';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { PLANS, PLAN_LIMITS } from '../../../../shared/constants/paymentConstants';

export interface UpdateSubscriptionDTO {
  subscriptionId: string;
  newPlan: keyof typeof PLANS;
  userId: string;
}

export class UpdateSubscriptionUseCase {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private stripeService: StripeService,
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

      // Validar que el plan sea diferente
      if (subscription.plan === dto.newPlan) {
        throw new Error('Ya tienes este plan activo');
      }

      // Si es cambio a plan gratuito, cancelar suscripción
      if (dto.newPlan === 'EXPLORADOR') {
        subscription.cancel(true);
        await this.subscriptionRepository.update(subscription);
        
        this.logger.info(`Suscripción cancelada y cambiada a plan gratuito: ${dto.subscriptionId}`);
        return;
      }

      // Para planes pagos, usar Stripe
      if (!subscription.stripeSubscriptionId) {
        throw new Error('Suscripción sin ID de Stripe válido');
      }

      const planConfig = PLAN_LIMITS[dto.newPlan];
      
      await this.stripeService.changePlan(subscription.stripeSubscriptionId, planConfig.priceId);

      // Actualizar plan en nuestra BD
      subscription.changePlan(dto.newPlan, planConfig.priceId);
      await this.subscriptionRepository.update(subscription);

      this.logger.info(`Plan cambiado exitosamente: ${dto.subscriptionId} a ${dto.newPlan}`);

    } catch (error) {
      this.logger.error(`Error actualizando suscripción ${dto.subscriptionId}:`, error);
      throw error;
    }
  }

  private validateInput(dto: UpdateSubscriptionDTO): void {
    if (!dto.subscriptionId) {
      throw ErrorHandler.createValidationError('ID de suscripción requerido');
    }

    if (!dto.userId) {
      throw ErrorHandler.createValidationError('ID de usuario requerido');
    }

    if (!Object.values(PLANS).includes(dto.newPlan)) {
      throw ErrorHandler.createValidationError('Plan inválido');
    }
  }
}