// src/modules/subscriptions/infrastructure/routes/SubscriptionRoutes.ts
import { Router } from 'express';
import { SubscriptionController } from '../controllers/SubscriptionController';
import { WebhookController } from '../controllers/WebhookController';
import { SubscriptionMiddleware } from '../middleware/SubscriptionMiddleware';
import { AuthMiddleware } from '../../../../shared/middleware/AuthMiddleware';

export class SubscriptionRoutes {
  private router: Router;

  constructor(
    private subscriptionController: SubscriptionController,
    private webhookController: WebhookController,
    private subscriptionMiddleware: SubscriptionMiddleware,
    private authMiddleware: AuthMiddleware
  ) {
    this.router = Router();
    this.configureRoutes();
  }

  private configureRoutes(): void {
    // Rutas públicas (webhooks)
    this.router.post(
      '/webhook/stripe',
      this.webhookController.handleStripeWebhook.bind(this.webhookController)
    );

    this.router.get(
      '/webhook/status',
      this.webhookController.getWebhookStatus.bind(this.webhookController)
    );

    // Rutas autenticadas
    this.router.use(this.authMiddleware.requireAuth);

    // Obtener suscripción actual del usuario
    this.router.get(
      '/current',
      this.subscriptionController.getCurrentSubscription.bind(this.subscriptionController)
    );

    // Crear nueva suscripción
    this.router.post(
      '/',
      this.subscriptionController.createSubscription.bind(this.subscriptionController)
    );

    // Actualizar suscripción (cambiar plan)
    this.router.put(
      '/:subscriptionId',
      this.subscriptionController.updateSubscription.bind(this.subscriptionController)
    );

    // Cancelar suscripción
    this.router.delete(
      '/:subscriptionId',
      this.subscriptionController.cancelSubscription.bind(this.subscriptionController)
    );

    // Obtener planes disponibles
    this.router.get(
      '/plans',
      this.subscriptionController.getAvailablePlans.bind(this.subscriptionController)
    );

    // Crear sesión de checkout de Stripe
    this.router.post(
      '/checkout-session',
      this.subscriptionController.createCheckoutSession.bind(this.subscriptionController)
    );

    // Obtener portal de facturación de Stripe
    this.router.post(
      '/billing-portal',
      this.subscriptionMiddleware.requireActiveSubscription,
      this.subscriptionController.createBillingPortalSession.bind(this.subscriptionController)
    );

    // Rutas administrativas (requieren permisos especiales)
    this.router.get(
      '/admin/stats',
      this.authMiddleware.requireRole('admin'),
      this.subscriptionController.getSubscriptionStats.bind(this.subscriptionController)
    );

    this.router.post(
      '/admin/cleanup',
      this.authMiddleware.requireRole('admin'),
      this.subscriptionController.cleanupExpiredSubscriptions.bind(this.subscriptionController)
    );

    // Rutas para testing (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      this.router.post(
        '/test/process-webhook',
        this.authMiddleware.requireRole('admin'),
        this.webhookController.handleStripeWebhook.bind(this.webhookController)
      );
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}