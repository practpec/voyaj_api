// src/modules/subscriptions/application/useCases/GetSubscription.ts
import { ISubscriptionRepository } from '../../domain/interfaces/ISubscriptionRepository';
import { IPlanRepository } from '../../domain/interfaces/IPlanRepository';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { SubscriptionResponseDTO } from '../dtos/SubscriptionDTO';

export interface SubscriptionWithPlanLimits extends SubscriptionResponseDTO {
  planLimits: {
    activeTrips: number | string;
    photosPerTrip: number | string;
    groupTripParticipants: number | string;
    exportFormats: string[];
    offlineMode: boolean;
  };
}

export class GetSubscriptionUseCase {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private planRepository: IPlanRepository,
    private logger: LoggerService
  ) {}

  public async execute(userId: string): Promise<SubscriptionWithPlanLimits | null> {
    try {
      // Validar entrada
      if (!userId) {
        throw ErrorHandler.createValidationError('ID de usuario requerido');
      }

      // Buscar suscripción activa
      const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
      
      if (!subscription) {
        this.logger.debug(`No se encontró suscripción activa para usuario: ${userId}`);
        return null;
      }

      // Obtener información del plan
      const plan = await this.planRepository.findById(subscription.planId);
      
      if (!plan) {
        this.logger.warn(`Plan no encontrado para suscripción: ${subscription.id}`);
        return null;
      }

      // Mapear a DTO de respuesta
      const response: SubscriptionWithPlanLimits = {
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
        trialEnd: subscription.data.trialEnd,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        stripeCustomerId: subscription.stripeCustomerId,
        createdAt: subscription.data.createdAt,
        updatedAt: subscription.data.updatedAt,
        planLimits: {
          activeTrips: plan.limits.activeTrips === -1 ? 'Ilimitados' : plan.limits.activeTrips,
          photosPerTrip: plan.limits.photosPerTrip === -1 ? 'Ilimitadas' : plan.limits.photosPerTrip,
          groupTripParticipants: plan.limits.groupTripParticipants === -1 ? 'Ilimitados' : 
            plan.limits.groupTripParticipants === 0 ? 'No disponible' : plan.limits.groupTripParticipants,
          exportFormats: plan.limits.exportFormats,
          offlineMode: plan.limits.offlineMode
        }
      };

      this.logger.debug(`Suscripción encontrada para usuario: ${userId}, plan: ${plan.code}`);
      return response;

    } catch (error) {
      this.logger.error(`Error obteniendo suscripción para usuario ${userId}:`, error);
      throw error;
    }
  }
}