// src/modules/subscriptions/application/useCases/GetAvailablePlans.ts
import { IPlanRepository } from '../../domain/interfaces/IPlanRepository';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { PlanDetailsDTO } from '../dtos/SubscriptionDTO';

export class GetAvailablePlansUseCase {
  constructor(
    private planRepository: IPlanRepository,
    private logger: LoggerService
  ) {}

  public async execute(): Promise<PlanDetailsDTO[]> {
    try {
      const plans = await this.planRepository.findOrderedPlans();

      const planDetails: PlanDetailsDTO[] = plans.map(plan => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        currency: plan.currency,
        features: plan.features,
        limits: {
          activeTrips: plan.limits.activeTrips === -1 ? 'Ilimitados' : plan.limits.activeTrips,
          photosPerTrip: plan.limits.photosPerTrip === -1 ? 'Ilimitadas' : plan.limits.photosPerTrip,
          groupTripParticipants: plan.limits.groupTripParticipants === -1 ? 'Ilimitados' : 
            plan.limits.groupTripParticipants === 0 ? 'No disponible' : plan.limits.groupTripParticipants,
          exportFormats: plan.limits.exportFormats,
          offlineMode: plan.limits.offlineMode
        },
        popular: plan.code === 'AVENTURERO', // Marcar aventurero como popular
        stripePriceIds: {
          monthly: plan.stripePriceIdMonthly,
          yearly: plan.stripePriceIdYearly
        }
      }));

      this.logger.debug('Planes disponibles obtenidos exitosamente');
      return planDetails;

    } catch (error) {
      this.logger.error('Error obteniendo planes disponibles:', error);
      throw error;
    }
  }

  // Obtener detalles de un plan específico
  public async getPlanDetails(planCode: string): Promise<PlanDetailsDTO | null> {
    try {
      const plan = await this.planRepository.findByCode(planCode);
      
      if (!plan) {
        this.logger.warn(`Plan no encontrado: ${planCode}`);
        return null;
      }

      return {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        currency: plan.currency,
        features: plan.features,
        limits: {
          activeTrips: plan.limits.activeTrips === -1 ? 'Ilimitados' : plan.limits.activeTrips,
          photosPerTrip: plan.limits.photosPerTrip === -1 ? 'Ilimitadas' : plan.limits.photosPerTrip,
          groupTripParticipants: plan.limits.groupTripParticipants === -1 ? 'Ilimitados' : 
            plan.limits.groupTripParticipants === 0 ? 'No disponible' : plan.limits.groupTripParticipants,
          exportFormats: plan.limits.exportFormats,
          offlineMode: plan.limits.offlineMode
        },
        popular: plan.code === 'AVENTURERO',
        stripePriceIds: {
          monthly: plan.stripePriceIdMonthly,
          yearly: plan.stripePriceIdYearly
        }
      };
    } catch (error) {
      this.logger.error(`Error obteniendo detalles del plan ${planCode}:`, error);
      throw error;
    }
  }
}