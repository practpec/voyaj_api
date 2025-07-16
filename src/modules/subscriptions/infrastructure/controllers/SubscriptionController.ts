// src/modules/subscriptions/infrastructure/controllers/SubscriptionController.ts
import { Request, Response } from 'express';
import { ResponseUtils } from '../../../../shared/utils/ResponseUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { BaseController } from '../../../../shared/controllers/BaseController';

// Use Cases
import { CreateSubscriptionUseCase } from '../../application/useCases/CreateSubscription';
import { UpdateSubscriptionUseCase } from '../../application/useCases/UpdateSubscription';
import { CancelSubscriptionUseCase } from '../../application/useCases/CancelSubscription';
import { GetSubscriptionUseCase } from '../../application/useCases/GetSubscription';
import { GetAvailablePlansUseCase } from '../../application/useCases/GetAvailablePlans';
import { ValidateFeatureAccessUseCase } from '../../application/useCases/ValidateFeatureAccess';

// Services & Repositories
import { SubscriptionMongoRepository } from '../repositories/SubscriptionMongoRepository';
import { PlanMongoRepository } from '../repositories/PlanMongoRepository';
import { UserMongoRepository } from '../../../users/infrastructure/repositories/UserMongoRepository';
import { StripeService } from '../services/StripeService';
import { EventBus } from '../../../../shared/events/EventBus';

export class SubscriptionController extends BaseController {
  private subscriptionRepository: SubscriptionMongoRepository;
  private planRepository: PlanMongoRepository;
  private userRepository: UserMongoRepository;
  private stripeService: StripeService;
  private eventBus: EventBus;

  // Use Cases
  private createSubscriptionUseCase: CreateSubscriptionUseCase;
  private updateSubscriptionUseCase: UpdateSubscriptionUseCase;
  private cancelSubscriptionUseCase: CancelSubscriptionUseCase;
  private getSubscriptionUseCase: GetSubscriptionUseCase;
  private getAvailablePlansUseCase: GetAvailablePlansUseCase;
  private validateFeatureAccessUseCase: ValidateFeatureAccessUseCase;

  constructor() {
    const logger = LoggerService.getInstance();
    super(logger);

    this.subscriptionRepository = new SubscriptionMongoRepository();
    this.planRepository = new PlanMongoRepository();
    this.userRepository = new UserMongoRepository();
    this.stripeService = StripeService.getInstance();
    this.eventBus = EventBus.getInstance();

    // Inicializar casos de uso
    this.createSubscriptionUseCase = new CreateSubscriptionUseCase(
      this.subscriptionRepository,
      this.planRepository,
      this.userRepository,
      this.stripeService,
      this.eventBus,
      this.logger
    );

    this.updateSubscriptionUseCase = new UpdateSubscriptionUseCase(
      this.subscriptionRepository,
      this.planRepository,
      this.stripeService,
      this.eventBus,
      this.logger
    );

    this.cancelSubscriptionUseCase = new CancelSubscriptionUseCase(
      this.subscriptionRepository,
      this.stripeService,
      this.eventBus,
      this.logger
    );

    this.getSubscriptionUseCase = new GetSubscriptionUseCase(
      this.subscriptionRepository,
      this.planRepository,
      this.logger
    );

    this.getAvailablePlansUseCase = new GetAvailablePlansUseCase(
      this.planRepository,
      this.logger
    );

    this.validateFeatureAccessUseCase = new ValidateFeatureAccessUseCase(
      this.subscriptionRepository,
      this.planRepository,
      this.logger
    );
  }

  // POST /api/subscriptions
  public createSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { planCode, trialDays } = req.body;

      const result = await this.createSubscriptionUseCase.execute({
        userId,
        planCode,
        trialDays
      });

      this.created(res, result, 'Suscripción creada exitosamente');
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // GET /api/subscriptions/current
  public getCurrentSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;

      const subscription = await this.getSubscriptionUseCase.execute(userId);

      if (!subscription) {
        this.notFound(res, 'No tienes una suscripción activa');
        return;
      }

      this.ok(res, subscription, 'Suscripción obtenida exitosamente');
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // PUT /api/subscriptions/:id
  public updateSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const subscriptionId = req.params.id;
      const { newPlanCode } = req.body;

      if (!subscriptionId) {
        this.badRequest(res, 'ID de suscripción requerido');
        return;
      }

      await this.updateSubscriptionUseCase.execute({
        subscriptionId,
        newPlanCode,
        userId
      });

      this.ok(res, undefined, 'Plan cambiado exitosamente');
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // POST /api/subscriptions/cancel
  public cancelSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { cancelImmediately = false, reason } = req.body;

      await this.cancelSubscriptionUseCase.execute({
        userId,
        cancelImmediately,
        reason
      });

      const message = cancelImmediately 
        ? 'Suscripción cancelada inmediatamente' 
        : 'Suscripción programada para cancelar';

      this.ok(res, undefined, message);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // GET /api/subscriptions/plans
  public getAvailablePlans = async (req: Request, res: Response): Promise<void> => {
    try {
      const plans = await this.getAvailablePlansUseCase.execute();
      this.ok(res, { plans }, 'Planes disponibles');
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // GET /api/subscriptions/feature-access
  public validateFeatureAccess = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { feature } = req.query;

      const access = await this.validateFeatureAccessUseCase.execute({
        userId,
        feature: feature as string
      });

      this.ok(res, access, 'Validación de acceso completada');
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // POST /api/subscriptions/checkout-session
  public createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { planCode, successUrl, cancelUrl } = req.body;

      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.notFound(res, 'Usuario no encontrado');
        return;
      }

      const plan = await this.planRepository.findByCode(planCode);
      if (!plan) {
        this.notFound(res, 'Plan no encontrado');
        return;
      }

      if (plan.isFree) {
        this.badRequest(res, 'El plan gratuito no requiere checkout');
        return;
      }

      const customer = await this.stripeService.createOrGetCustomer(
        userId,
        user.email,
        user.name
      );

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [{
          price: plan.stripePriceIdMonthly,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          planCode
        }
      });

      this.ok(res, {
        sessionId: session.id,
        sessionUrl: session.url,
        publicKey: process.env.STRIPE_PUBLISHABLE_KEY
      }, 'Sesión de checkout creada exitosamente');

    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // POST /api/subscriptions/billing-portal
  public createBillingPortalSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { returnUrl } = req.body;

      const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
      if (!subscription || !subscription.stripeCustomerId) {
        this.badRequest(res, 'No se encontró información de facturación');
        return;
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: returnUrl
      });

      this.ok(res, {
        portalUrl: session.url
      }, 'Sesión de portal de facturación creada exitosamente');

    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // GET /api/subscriptions/billing-history
  public getBillingHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;

      const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
      if (!subscription || !subscription.stripeCustomerId) {
        this.ok(res, { invoices: [] }, 'Historial de facturación');
        return;
      }

      const invoices = await this.stripeService.getCustomerInvoices(subscription.stripeCustomerId);

      const billingHistory = invoices.map(invoice => ({
        id: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        date: new Date(invoice.created * 1000),
        description: invoice.description || 'Suscripción Voyaj',
        pdfUrl: invoice.hosted_invoice_url
      }));

      this.ok(res, { invoices: billingHistory }, 'Historial de facturación');
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // GET /api/subscriptions/admin/stats
  public getSubscriptionStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const [totalActive, totalCanceled, activePlans] = await Promise.all([
        this.subscriptionRepository.countActiveSubscriptions(),
        this.subscriptionRepository.countCanceledSubscriptions(),
        this.planRepository.findActivePlans()
      ]);

      const byPlan: Record<string, number> = {};
      
      for (const plan of activePlans) {
        byPlan[plan.code] = await this.subscriptionRepository.countSubscriptionsByPlan(plan.id);
      }

      const stats = {
        totalActive,
        totalCanceled,
        byPlan,
        growth: {
          thisMonth: 0,
          lastMonth: 0,
          percentageChange: 0
        },
        revenue: {
          monthly: 0,
          yearly: 0,
          currency: 'MXN'
        }
      };

      this.ok(res, stats, 'Estadísticas obtenidas exitosamente');
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };

  // POST /api/subscriptions/admin/cleanup
  public cleanupExpiredSubscriptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const cleaned = await this.subscriptionRepository.cleanupExpiredSubscriptions();
      
      this.ok(res, { cleaned }, `${cleaned} suscripciones expiradas eliminadas`);
    } catch (error) {
      const errorResponse = ErrorHandler.handleError(error as Error);
      ResponseUtils.error(
        res,
        errorResponse.statusCode,
        errorResponse.errorCode,
        errorResponse.message,
        errorResponse.details
      );
    }
  };
}