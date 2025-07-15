// src/modules/subscriptions/application/useCases/CancelSubscription.ts
import { ISubscriptionRepository } from '../../domain/interfaces/ISubscriptionRepository';
import { StripeService } from '../../infrastructure/services/StripeService';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';

export interface CancelSubscriptionDTO {
  userId: string;
  cancelImmediately?: boolean;
  reason?: string;
}

export class CancelSubscriptionUseCase {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private stripeService: StripeService,
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

      // Si es plan gratuito, cancelar directamente
      if (subscription.plan === 'EXPLORADOR') {
        subscription.cancel(true);
        await this.subscriptionRepository.update(subscription);
        
        this.logger.info(`Suscripción gratuita cancelada para usuario: ${dto.userId}`);
        return;
      }

      // Para planes pagos, cancelar en Stripe
      if (!subscription.stripeSubscriptionId) {
        throw new Error('Suscripción sin ID de Stripe válido');
      }

      await this.stripeService.cancelSubscription(
        subscription.stripeSubscriptionId,
        !dto.cancelImmediately
      );

      // Actualizar suscripción local
      subscription.cancel(!dto.cancelImmediately);
      await this.subscriptionRepository.update(subscription);

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