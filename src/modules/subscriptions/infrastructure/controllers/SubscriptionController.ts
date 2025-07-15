// src/modules/subscriptions/infrastructure/controllers/SubscriptionController.ts - Updated
import { Request, Response } from 'express';
import { ResponseUtils } from '../../../../shared/utils/ResponseUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { LoggerService } from '../../../../shared/services/LoggerService';

// Use Cases
import { CreateSubscriptionUseCase } from '../../application/useCases/CreateSubscription';
import { CancelSubscriptionUseCase } from '../../application/useCases/CancelSubscription';
import { GetSubscriptionUseCase } from '../../application/useCases/GetSubscription';
import { ProcessWebhookUseCase } from '../../application/useCases/ProcessWebhook';
import { GetAvailablePlansUseCase } from '../../application/useCases/GetAvailablePlans';

// Services & Repository
import { StripeService } from '../services/StripeService';
import { SubscriptionMongoRepository } from '../repositories/SubscriptionMongoRepository';
import { UserMongoRepository } from '../../../users/infrastructure/repositories/UserMongoRepository';
import { PLAN_LIMITS } from '../../../../shared/constants/paymentConstants';

export class SubscriptionController {
  private logger: LoggerService;
  private stripeService: StripeService;
  private subscriptionRepository: SubscriptionMongoRepository;
  private userRepository: UserMongoRepository;

  // Use Cases
  private createSubscriptionUseCase: CreateSubscriptionUseCase;
  private cancelSubscriptionUseCase: CancelSubscriptionUseCase;
  private getSubscriptionUseCase: GetSubscriptionUseCase;
  private processWebhookUseCase: ProcessWebhookUseCase;
  private getAvailablePlansUseCase: GetAvailablePlansUseCase;

  constructor() {
    this.logger = LoggerService.getInstance();
    this.stripeService = StripeService.getInstance();
    this.subscriptionRepository = new SubscriptionMongoRepository();
    this.userRepository = new UserMongoRepository();

    // Inicializar casos de uso
    this.createSubscriptionUseCase = new CreateSubscriptionUseCase(
      this.subscriptionRepository,
      this.userRepository,
      this.stripeService,
      this.logger
    );

    this.cancelSubscriptionUseCase = new CancelSubscriptionUseCase(
      this.subscriptionRepository,
      this.stripeService,
      this.logger
    );

    this.getSubscriptionUseCase = new GetSubscriptionUseCase(
      this.subscriptionRepository,
      this.logger
    );

    this.processWebhookUseCase = new ProcessWebhookUseCase(
      this.subscriptionRepository,
      this.userRepository,
      this.stripeService,
      this.logger
    );

    this.getAvailablePlansUseCase = new GetAvailablePlansUseCase(this.logger);
  }

  // POST /api/subscriptions
  public createSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { plan, trialDays } = req.body;

      const result = await this.createSubscriptionUseCase.execute({
        userId,
        plan,
        trialDays
      });

      ResponseUtils.created(res, result, 'Suscripción creada exitosamente');
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
        ResponseUtils.notFound(res, 'No tienes una suscripción activa');
        return;
      }

      ResponseUtils.success(res, subscription, 'Suscripción obtenida exitosamente');
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
      const { newPlan } = req.body;

      // Obtener suscripción actual
      const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
      if (!subscription) {
        ResponseUtils.notFound(res, 'No tienes una suscripción activa');
        return;
      }

      // Validar que el plan sea diferente
      if (subscription.plan === newPlan) {
        ResponseUtils.error(res, 400, 'SAME_PLAN', 'Ya tienes este plan activo');
        return;
      }

      // Si es cambio a plan gratuito, cancelar suscripción
      if (newPlan === 'EXPLORADOR') {
        await this.cancelSubscriptionUseCase.execute({
          userId,
          cancelImmediately: true
        });

        // Crear nueva suscripción gratuita
        const result = await this.createSubscriptionUseCase.execute({
          userId,
          plan: newPlan
        });

        ResponseUtils.success(res, result, 'Plan cambiado a Explorador exitosamente');
        return;
      }

      // Para planes pagos, usar Stripe
      if (!subscription.stripeSubscriptionId) {
        ResponseUtils.error(res, 400, 'INVALID_SUBSCRIPTION', 'Suscripción sin Stripe ID');
        return;
      }

      const planConfig = PLAN_LIMITS[newPlan as keyof typeof PLAN_LIMITS];
      
      await this.stripeService.changePlan(subscription.stripeSubscriptionId, planConfig.priceId);

      // Actualizar plan en nuestra BD
      subscription.changePlan(newPlan, planConfig.priceId);
      await this.subscriptionRepository.update(subscription);

      ResponseUtils.success(res, undefined, 'Plan cambiado exitosamente');
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
      const { cancelImmediately = false } = req.body;

      await this.cancelSubscriptionUseCase.execute({
        userId,
        cancelImmediately
      });

      ResponseUtils.success(
        res, 
        undefined, 
        cancelImmediately ? 'Suscripción cancelada inmediatamente' : 'Suscripción programada para cancelar'
      );
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
      const { plan, successUrl, cancelUrl } = req.body;

      // Obtener usuario
      const user = await this.userRepository.findById(userId);
      if (!user) {
        ResponseUtils.error(res, 404, 'USER_NOT_FOUND', 'Usuario no encontrado');
        return;
      }

      // Crear customer en Stripe
      const customer = await this.stripeService.createOrGetCustomer(
        userId,
        user.email,
        user.name
      );

      // Obtener configuración del plan
      const planConfig = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];

      if (!planConfig || !planConfig.priceId) {
        ResponseUtils.error(res, 400, 'INVALID_PLAN', 'Plan no válido');
        return;
      }

      // Crear sesión de checkout con Stripe
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [{
          price: planConfig.priceId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          plan
        }
      });

      ResponseUtils.success(res, {
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
        ResponseUtils.error(res, 400, 'NO_CUSTOMER', 'No se encontró información de facturación');
        return;
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: returnUrl
      });

      ResponseUtils.success(res, {
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

  // GET /api/subscriptions/plans
  public getAvailablePlans = async (req: Request, res: Response): Promise<void> => {
    try {
      const plans = await this.getAvailablePlansUseCase.execute();
      ResponseUtils.success(res, { plans }, 'Planes disponibles');
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
        ResponseUtils.success(res, { invoices: [] }, 'Historial de facturación');
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

      ResponseUtils.success(res, { invoices: billingHistory }, 'Historial de facturación');
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
      const [totalActive, totalCanceled, explorerCount, adventurerCount, nomadCount] = 
        await Promise.all([
          this.subscriptionRepository.countActiveSubscriptions(),
          this.subscriptionRepository.countCanceledSubscriptions(),
          this.subscriptionRepository.countSubscriptionsByPlan('EXPLORADOR'),
          this.subscriptionRepository.countSubscriptionsByPlan('AVENTURERO'),
          this.subscriptionRepository.countSubscriptionsByPlan('NOMADA')
        ]);

      const stats = {
        totalActive,
        totalCanceled,
        byPlan: {
          'EXPLORADOR': explorerCount,
          'AVENTURERO': adventurerCount,
          'NOMADA': nomadCount
        },
        growth: {
          thisMonth: 0, // Implementar lógica de crecimiento
          lastMonth: 0,
          percentageChange: 0
        },
        revenue: {
          monthly: 0, // Implementar cálculo de ingresos
          yearly: 0,
          currency: 'MXN'
        }
      };

      ResponseUtils.success(res, stats, 'Estadísticas obtenidas exitosamente');
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
      
      ResponseUtils.success(res, { 
        cleaned 
      }, `${cleaned} suscripciones expiradas eliminadas`);
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

  // POST /api/subscriptions/webhook
  public handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

      if (!signature || !endpointSecret) {
        ResponseUtils.error(res, 400, 'INVALID_WEBHOOK', 'Webhook signature missing');
        return;
      }

      const payload = JSON.stringify(req.body);

      await this.processWebhookUseCase.execute({
        payload,
        signature,
        endpointSecret
      });

      ResponseUtils.success(res, { received: true }, 'Webhook procesado exitosamente');
    } catch (error) {
      this.logger.error('Error procesando webhook:', error);
      ResponseUtils.error(res, 400, 'WEBHOOK_ERROR', 'Error procesando webhook');
    }
  };
}