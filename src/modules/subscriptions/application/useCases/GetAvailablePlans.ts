// src/modules/subscriptions/application/useCases/GetAvailablePlans.ts
import { PlanDetailsDTO } from '../dtos/SubscriptionDTO';
import { LoggerService } from '../../../../shared/services/LoggerService';

export class GetAvailablePlansUseCase {
  constructor(private logger: LoggerService) {}

  public async execute(): Promise<PlanDetailsDTO[]> {
    try {
      const plans: PlanDetailsDTO[] = [
        {
          id: 'EXPLORADOR',
          name: 'Explorador',
          description: 'Perfecto para comenzar a organizar tus viajes personales',
          price: {
            monthly: 0,
            yearly: 0,
            currency: 'USD'
          },
          features: [
            '1 viaje activo',
            '10 fotos por viaje',
            'Organización básica por fecha y ubicación',
            'Exportación en PDF básico',
            'Soporte por email'
          ],
          limits: {
            activeTrips: 1,
            photosPerTrip: 10,
            groupTripParticipants: 0,
            exportFormats: ['PDF'],
            offlineMode: false
          },
          stripePriceIds: {
            monthly: '',
            yearly: ''
          }
        },
        {
          id: 'AVENTURERO',
          name: 'Aventurero',
          description: 'Para viajeros frecuentes que quieren más flexibilidad',
          price: {
            monthly: 9.99,
            yearly: 99.99,
            currency: 'USD'
          },
          features: [
            '5 viajes activos',
            '100 fotos por viaje',
            'Viajes grupales (hasta 5 participantes)',
            'Múltiples formatos de exportación',
            'Sincronización automática',
            'Soporte prioritario'
          ],
          limits: {
            activeTrips: 5,
            photosPerTrip: 100,
            groupTripParticipants: 5,
            exportFormats: ['PDF', 'JSON', 'ZIP'],
            offlineMode: true
          },
          popular: true,
          stripePriceIds: {
            monthly: process.env.STRIPE_PRICE_AVENTURERO_MONTHLY || 'price_aventurero_monthly',
            yearly: process.env.STRIPE_PRICE_AVENTURERO_YEARLY || 'price_aventurero_yearly'
          }
        },
        {
          id: 'EXPEDICIONARIO',
          name: 'Expedicionario',
          description: 'Para aventureros sin límites que viven viajando',
          price: {
            monthly: 19.99,
            yearly: 199.99,
            currency: 'USD'
          },
          features: [
            'Viajes ilimitados',
            'Fotos ilimitadas',
            'Viajes grupales ilimitados',
            'Todos los formatos de exportación',
            'Modo offline completo',
            'Backups automáticos',
            'API de acceso',
            'Soporte dedicado 24/7'
          ],
          limits: {
            activeTrips: 'Ilimitados',
            photosPerTrip: 'Ilimitadas',
            groupTripParticipants: 'Ilimitados',
            exportFormats: ['PDF', 'JSON', 'ZIP', 'KML', 'GPX'],
            offlineMode: true
          },
          stripePriceIds: {
            monthly: process.env.STRIPE_PRICE_EXPEDICIONARIO_MONTHLY || 'price_expedicionario_monthly',
            yearly: process.env.STRIPE_PRICE_EXPEDICIONARIO_YEARLY || 'price_expedicionario_yearly'
          }
        }
      ];

      this.logger.debug('Planes disponibles obtenidos exitosamente');
      return plans;

    } catch (error) {
      this.logger.error('Error obteniendo planes disponibles:', error);
      throw error;
    }
  }

  // Obtener detalles de un plan específico
  public async getPlanDetails(planId: string): Promise<PlanDetailsDTO | null> {
    try {
      const plans = await this.execute();
      const plan = plans.find(p => p.id === planId);
      
      if (!plan) {
        this.logger.warn(`Plan no encontrado: ${planId}`);
        return null;
      }

      return plan;
    } catch (error) {
      this.logger.error(`Error obteniendo detalles del plan ${planId}:`, error);
      throw error;
    }
  }

  // Comparar dos planes
  public async comparePlans(currentPlan: string, targetPlan: string): Promise<{
    isUpgrade: boolean;
    isDowngrade: boolean;
    changes: {
      feature: string;
      current: any;
      target: any;
      type: 'improvement' | 'limitation';
    }[];
  }> {
    try {
      const [current, target] = await Promise.all([
        this.getPlanDetails(currentPlan),
        this.getPlanDetails(targetPlan)
      ]);

      if (!current || !target) {
        throw new Error('Uno de los planes no existe');
      }

      const planHierarchy = { 'EXPLORADOR': 0, 'AVENTURERO': 1, 'EXPEDICIONARIO': 2 };
      const isUpgrade = planHierarchy[targetPlan as keyof typeof planHierarchy] > 
                       planHierarchy[currentPlan as keyof typeof planHierarchy];
      const isDowngrade = !isUpgrade && currentPlan !== targetPlan;

      const changes = [];

      // Comparar límites
      if (current.limits.activeTrips !== target.limits.activeTrips) {
        changes.push({
          feature: 'Viajes activos',
          current: current.limits.activeTrips,
          target: target.limits.activeTrips,
          type: isUpgrade ? 'improvement' : 'limitation'
        });
      }

      if (current.limits.photosPerTrip !== target.limits.photosPerTrip) {
        changes.push({
          feature: 'Fotos por viaje',
          current: current.limits.photosPerTrip,
          target: target.limits.photosPerTrip,
          type: isUpgrade ? 'improvement' : 'limitation'
        });
      }

      if (current.limits.groupTripParticipants !== target.limits.groupTripParticipants) {
        changes.push({
          feature: 'Participantes en viajes grupales',
          current: current.limits.groupTripParticipants,
          target: target.limits.groupTripParticipants,
          type: isUpgrade ? 'improvement' : 'limitation'
        });
      }

      return {
        isUpgrade,
        isDowngrade,
        changes
      };

    } catch (error) {
      this.logger.error('Error comparando planes:', error);
      throw error;
    }
  }
}