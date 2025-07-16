// src/modules/subscriptions/infrastructure/seeds/plansSeed.ts
import { PlanMongoRepository } from '../repositories/PlanMongoRepository';
import { Plan } from '../../domain/Plan';
import { LoggerService } from '../../../../shared/services/LoggerService';

export class PlansSeedService {
  private planRepository: PlanMongoRepository;
  private logger: LoggerService;

  constructor() {
    this.planRepository = new PlanMongoRepository();
    this.logger = LoggerService.getInstance();
  }

  public async seedPlans(): Promise<void> {
    try {
      // Verificar si ya existen planes
      const existingPlans = await this.planRepository.findActivePlans();
      if (existingPlans.length > 0) {
        this.logger.info('Los planes ya existen, saltando seed');
        return;
      }

      // Crear plan Explorador (gratuito)
      const explorerPlan = Plan.create(
        'EXPLORADOR',
        'Explorador',
        'Perfecto para comenzar a organizar tus viajes personales',
        0,
        0,
        {
          activeTrips: 1,
          photosPerTrip: 10,
          groupTripParticipants: 0,
          exportFormats: ['PDF'],
          offlineMode: false
        },
        [
          '1 viaje activo',
          '10 fotos por viaje',
          'Organización básica por fecha y ubicación',
          'Exportación en PDF básico',
          'Soporte por email'
        ]
      );

      explorerPlan.update({ displayOrder: 1 });

      // Crear plan Aventurero
      const adventurerPlan = Plan.create(
        'AVENTURERO',
        'Aventurero',
        'Para viajeros frecuentes que quieren más flexibilidad',
        99,
        990,
        {
          activeTrips: 5,
          photosPerTrip: 100,
          groupTripParticipants: 5,
          exportFormats: ['PDF', 'JSON', 'ZIP'],
          offlineMode: true
        },
        [
          '5 viajes activos',
          '100 fotos por viaje',
          'Viajes grupales (hasta 5 participantes)',
          'Múltiples formatos de exportación',
          'Sincronización automática',
          'Soporte prioritario'
        ]
      );

      adventurerPlan.update({ 
        displayOrder: 2,
        stripePriceIdMonthly: process.env.STRIPE_PRICE_AVENTURERO_MONTHLY,
        stripePriceIdYearly: process.env.STRIPE_PRICE_AVENTURERO_YEARLY
      });

      // Crear plan Expedicionario
      const expeditionaryPlan = Plan.create(
        'EXPEDICIONARIO',
        'Expedicionario',
        'Para aventureros sin límites que viven viajando',
        199,
        1990,
        {
          activeTrips: -1,
          photosPerTrip: -1,
          groupTripParticipants: -1,
          exportFormats: ['PDF', 'JSON', 'ZIP', 'KML', 'GPX'],
          offlineMode: true
        },
        [
          'Viajes ilimitados',
          'Fotos ilimitadas',
          'Viajes grupales ilimitados',
          'Todos los formatos de exportación',
          'Modo offline completo',
          'Backups automáticos',
          'API de acceso',
          'Soporte dedicado 24/7'
        ]
      );

      expeditionaryPlan.update({ 
        displayOrder: 3,
        stripePriceIdMonthly: process.env.STRIPE_PRICE_EXPEDICIONARIO_MONTHLY,
        stripePriceIdYearly: process.env.STRIPE_PRICE_EXPEDICIONARIO_YEARLY
      });

      // Guardar planes en la base de datos
      await this.planRepository.create(explorerPlan);
      await this.planRepository.create(adventurerPlan);
      await this.planRepository.create(expeditionaryPlan);

      this.logger.info('Planes de suscripción creados exitosamente');
    } catch (error) {
      this.logger.error('Error creando planes de suscripción:', error);
      throw error;
    }
  }
}