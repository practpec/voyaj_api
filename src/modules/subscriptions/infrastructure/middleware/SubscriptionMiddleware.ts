// src/modules/subscriptions/infrastructure/middleware/SubscriptionMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { GetSubscriptionUseCase } from '../../application/useCases/GetSubscription';
import { LoggerService } from '../../../../shared/services/LoggerService';

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
  constructor(
    private getSubscriptionUseCase: GetSubscriptionUseCase,
    private logger: LoggerService
  ) {}

  // Middleware para verificar suscripción activa
  public requireActiveSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const subscription = await this.getSubscriptionUseCase.execute(userId);

      if (!subscription || !subscription.isActive) {
        res.status(403).json({
          success: false,
          message: 'Suscripción activa requerida',
          code: 'SUBSCRIPTION_REQUIRED'
        });
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
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };

  // Middleware para verificar plan específico
  public requirePlan = (requiredPlan: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const userId = req.user?.id;

        if (!userId) {
          res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
          return;
        }

        const subscription = await this.getSubscriptionUseCase.execute(userId);

        if (!subscription || subscription.plan !== requiredPlan) {
          res.status(403).json({
            success: false,
            message: `Plan ${requiredPlan} requerido`,
            code: 'PLAN_REQUIRED',
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
        res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  };

  // Middleware para verificar funcionalidad específica
  public requireFeature = (feature: 'groupTrips' | 'offlineMode' | 'exportFormats') => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const userId = req.user?.id;

        if (!userId) {
          res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
          });
          return;
        }

        const subscription = await this.getSubscriptionUseCase.execute(userId);

        if (!subscription || !subscription.isActive) {
          res.status(403).json({
            success: false,
            message: 'Suscripción activa requerida',
            code: 'SUBSCRIPTION_REQUIRED'
          });
          return;
        }

        // Verificar funcionalidad específica
        const hasFeature = this.checkFeatureAccess(subscription, feature);

        if (!hasFeature) {
          res.status(403).json({
            success: false,
            message: `Funcionalidad ${feature} no disponible en tu plan`,
            code: 'FEATURE_NOT_AVAILABLE',
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
        res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  };

  // Middleware para agregar información de suscripción (opcional)
  public addSubscriptionInfo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (userId) {
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

  private checkFeatureAccess(subscription: any, feature: string): boolean {
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