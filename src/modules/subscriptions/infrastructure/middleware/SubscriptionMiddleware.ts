// src/modules/subscriptions/infrastructure/middleware/SubscriptionMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { GetSubscriptionUseCase } from '../../application/useCases/GetSubscription';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { SubscriptionMongoRepository } from '../repositories/SubscriptionMongoRepository';
import { PlanMongoRepository } from '../repositories/PlanMongoRepository';
import { ResponseUtils } from '../../../../shared/utils/ResponseUtils';

// Extender Request para incluir información de suscripción
declare global {
  namespace Express {
    interface Request {
      subscription?: {
        id: string;
        planCode: string;
        status: string;
        isActive: boolean;
        limits: {
          activeTrips: number;
          photosPerTrip: number;
          groupTripParticipants: number;
          exportFormats: string[];
          offlineMode: boolean;
        };
      };
    }
  }
}

export class SubscriptionMiddleware {
  private static getSubscriptionUseCase: GetSubscriptionUseCase;
  private static logger = LoggerService.getInstance();

  // Inicializar servicios de forma estática
  private static initializeServices(): void {
    if (!this.getSubscriptionUseCase) {
      const subscriptionRepository = new SubscriptionMongoRepository();
      const planRepository = new PlanMongoRepository();
      this.getSubscriptionUseCase = new GetSubscriptionUseCase(
        subscriptionRepository,
        planRepository,
        this.logger
      );
    }
  }

  // Convertir límites string/number a solo números para el middleware
  private static normalizeLimits(planLimits: any): {
    activeTrips: number;
    photosPerTrip: number;
    groupTripParticipants: number;
    exportFormats: string[];
    offlineMode: boolean;
  } {
    return {
      activeTrips: typeof planLimits.activeTrips === 'string' ? -1 : planLimits.activeTrips,
      photosPerTrip: typeof planLimits.photosPerTrip === 'string' ? -1 : planLimits.photosPerTrip,
      groupTripParticipants: typeof planLimits.groupTripParticipants === 'string' ? -1 : planLimits.groupTripParticipants,
      exportFormats: planLimits.exportFormats,
      offlineMode: planLimits.offlineMode
    };
  }

  // Middleware para verificar suscripción activa
  public static requireActiveSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        ResponseUtils.unauthorized(res, 'Usuario no autenticado');
        return;
      }

      this.initializeServices();
      const subscription = await this.getSubscriptionUseCase.execute(userId);

      if (!subscription || !subscription.isActive) {
        ResponseUtils.forbidden(res, 'Suscripción activa requerida');
        return;
      }

      // Agregar información de suscripción al request con límites normalizados
      req.subscription = {
        id: subscription.id,
        planCode: subscription.planCode,
        status: subscription.status,
        isActive: subscription.isActive,
        limits: this.normalizeLimits(subscription.planLimits)
      };

      next();
    } catch (error) {
      this.logger.error('Error verificando suscripción:', error);
      ResponseUtils.internalServerError(res);
    }
  };

  // Middleware para verificar plan específico
  public static requirePlan = (requiredPlanCode: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const userId = req.user?.userId;

        if (!userId) {
          ResponseUtils.unauthorized(res, 'Usuario no autenticado');
          return;
        }

        this.initializeServices();
        const subscription = await this.getSubscriptionUseCase.execute(userId);

        if (!subscription || subscription.planCode !== requiredPlanCode) {
          ResponseUtils.error(res, 403, 'PLAN_REQUIRED', `Plan ${requiredPlanCode} requerido`, {
            currentPlan: subscription?.planCode || 'NONE'
          });
          return;
        }

        req.subscription = {
          id: subscription.id,
          planCode: subscription.planCode,
          status: subscription.status,
          isActive: subscription.isActive,
          limits: this.normalizeLimits(subscription.planLimits)
        };

        next();
      } catch (error) {
        this.logger.error('Error verificando plan:', error);
        ResponseUtils.internalServerError(res);
      }
    };
  };

  // Middleware para verificar funcionalidad específica
  public static requireFeature = (feature: 'groupTrips' | 'offlineMode' | 'exportFormats') => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const userId = req.user?.userId;

        if (!userId) {
          ResponseUtils.unauthorized(res, 'Usuario no autenticado');
          return;
        }

        this.initializeServices();
        const subscription = await this.getSubscriptionUseCase.execute(userId);

        if (!subscription || !subscription.isActive) {
          ResponseUtils.forbidden(res, 'Suscripción activa requerida');
          return;
        }

        // Verificar funcionalidad específica
        const normalizedLimits = this.normalizeLimits(subscription.planLimits);
        const hasFeature = this.checkFeatureAccess(normalizedLimits, feature);

        if (!hasFeature) {
          ResponseUtils.error(res, 403, 'FEATURE_NOT_AVAILABLE', 
            `Funcionalidad ${feature} no disponible en tu plan`, {
            currentPlan: subscription.planCode
          });
          return;
        }

        req.subscription = {
          id: subscription.id,
          planCode: subscription.planCode,
          status: subscription.status,
          isActive: subscription.isActive,
          limits: normalizedLimits
        };

        next();
      } catch (error) {
        this.logger.error('Error verificando funcionalidad:', error);
        ResponseUtils.internalServerError(res);
      }
    };
  };

  // Middleware para agregar información de suscripción (opcional)
  public static addSubscriptionInfo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (userId) {
        this.initializeServices();
        const subscription = await this.getSubscriptionUseCase.execute(userId);

        if (subscription) {
          req.subscription = {
            id: subscription.id,
            planCode: subscription.planCode,
            status: subscription.status,
            isActive: subscription.isActive,
            limits: this.normalizeLimits(subscription.planLimits)
          };
        }
      }

      next();
    } catch (error) {
      this.logger.error('Error agregando información de suscripción:', error);
      // No bloquear la petición, solo logear el error
      next();
    }
  };

  private static checkFeatureAccess(limits: any, feature: string): boolean {
    switch (feature) {
      case 'groupTrips':
        return limits.groupTripParticipants > 0 || limits.groupTripParticipants === -1;
      
      case 'offlineMode':
        return limits.offlineMode;
      
      case 'exportFormats':
        return limits.exportFormats.length > 1;
      
      default:
        return false;
    }
  }
}