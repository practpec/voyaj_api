// src/modules/subscriptions/application/useCases/GetSubscription.ts
import { ISubscriptionRepository } from '../../domain/interfaces/ISubscriptionRepository';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';

export interface SubscriptionResponseDTO {
  id: string;
  plan: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  isActive: boolean;
  isCanceled: boolean;
  isTrialing: boolean;
  trialEnd?: Date;
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
    private logger: LoggerService
  ) {}

  public async execute(userId: string): Promise<SubscriptionResponseDTO | null> {
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

      // Mapear a DTO de respuesta
      const limits = subscription.planLimits;
      
      const response: SubscriptionResponseDTO = {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.data.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.data.cancelAtPeriodEnd,
        isActive: subscription.isActive,
        isCanceled: subscription.isCanceled,
        isTrialing: subscription.isTrialing,
        trialEnd: subscription.data.trialEnd,
        planLimits: {
          activeTrips: limits.activeTrips === -1 ? 'Ilimitados' : limits.activeTrips,
          photosPerTrip: limits.photosPerTrip === -1 ? 'Ilimitadas' : limits.photosPerTrip,
          groupTripParticipants: limits.groupTripParticipants === -1 ? 'Ilimitados' : 
            limits.groupTripParticipants === 0 ? 'No disponible' : limits.groupTripParticipants,
          exportFormats: limits.exportFormats,
          offlineMode: limits.offlineMode
        }
      };

      this.logger.debug(`Suscripción encontrada para usuario: ${userId}, plan: ${subscription.plan}`);
      return response;

    } catch (error) {
      this.logger.error(`Error obteniendo suscripción para usuario ${userId}:`, error);
      throw error;
    }
  }
}