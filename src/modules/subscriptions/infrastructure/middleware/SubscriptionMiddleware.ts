// src/modules/subscriptions/infrastructure/middleware/SubscriptionMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { GetSubscriptionUseCase } from '../../application/useCases/GetSubscription';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { SubscriptionMongoRepository } from '../repositories/SubscriptionMongoRepository';
import { ResponseUtils } from '../../../../shared/utils/ResponseUtils';

// Extender Request para incluir información de suscripción
declare global {
  namespace Express {
    interface Request {
      subscription?: {
        id: string;
        plan: string;
        status: string;
        isActive: boolean;
        limits: {
          activeTrips: number | string;
          photosPerTrip: number | string;
          groupTripParticipants: number | string;
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
      this.getSubscriptionUseCase = new GetSubscriptionUseCase(
        subscriptionRepository,
        this.logger
      );
    }
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

      // Agregar información de suscripción al request
      req.subscription = {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        isActive: subscription.isActive,
        limits: subscription.planLimits
      };

      next();
    } catch (error) {
      this.logger.error('Error verificando suscripción:', error);
      ResponseUtils.internalServerError(res);
    }
  };

  // Middleware para verificar plan específico
  public static requirePlan = (requiredPlan: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const userId = req.user?.userId;

        if (!userId) {
          ResponseUtils.unauthorized(res, 'Usuario no autenticado');
          return;
        }

        this.initializeServices();
        const subscription = await this.getSubscriptionUseCase.execute(userId);

        if (!subscription || subscription.plan !== requiredPlan) {
          ResponseUtils.error(res, 403, 'PLAN_REQUIRED', `Plan ${requiredPlan} requerido`, {
            currentPlan: subscription?.plan || 'NONE'
          });
          return;
        }

        req.subscription = {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          isActive: subscription.isActive,
          limits: subscription.planLimits
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
        const hasFeature = this.checkFeatureAccess(subscription, feature);

        if (!hasFeature) {
          ResponseUtils.error(res, 403, 'FEATURE_NOT_AVAILABLE', 
            `Funcionalidad ${feature} no disponible en tu plan`, {
            currentPlan: subscription.plan
          });
          return;
        }

        req.subscription = {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          isActive: subscription.isActive,
          limits: subscription.planLimits
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
            plan: subscription.plan,
            status: subscription.status,
            isActive: subscription.isActive,
            limits: subscription.planLimits
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

  private static checkFeatureAccess(subscription: any, feature: string): boolean {
    switch (feature) {
      case 'groupTrips':
        return subscription.planLimits.groupTripParticipants > 0;
      
      case 'offlineMode':
        return subscription.planLimits.offlineMode;
      
      case 'exportFormats':
        return subscription.planLimits.exportFormats.length > 1;
      
      default:
        return false;
    }
  }
}