// src/modules/subscriptions/infrastructure/routes/subscriptionRoutes.ts
import { Router, Request, Response } from 'express';
import { SubscriptionController } from '../controllers/SubscriptionController';
import { AuthMiddleware } from '../../../../shared/middleware/AuthMiddleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Inicialización lazy del controlador
let subscriptionController: SubscriptionController | null = null;

const getSubscriptionController = (): SubscriptionController => {
  if (!subscriptionController) {
    subscriptionController = new SubscriptionController();
  }
  return subscriptionController;
};

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: {
    error: 'Demasiadas peticiones. Intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 50, // Stripe puede enviar muchos webhooks
  message: {
    error: 'Demasiados webhooks. Intenta de nuevo más tarde.'
  }
});

// ============================================================================
// RUTAS PÚBLICAS
// ============================================================================

// Obtener planes disponibles (público)
router.get('/plans', 
  generalLimiter,
  (req: Request, res: Response) => getSubscriptionController().getAvailablePlans(req, res)
);

// Webhook de Stripe (público pero firmado)
router.post('/webhook',
  webhookLimiter,
  (req: Request, res: Response) => getSubscriptionController().handleWebhook(req, res)
);

// ============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================================================

// Crear suscripción
router.post('/',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.checkUserStatus,
  (req: Request, res: Response) => getSubscriptionController().createSubscription(req, res)
);

// Obtener suscripción actual
router.get('/current',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.checkUserStatus,
  (req: Request, res: Response) => getSubscriptionController().getCurrentSubscription(req, res)
);

// Cancelar suscripción
router.post('/cancel',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.checkUserStatus,
  (req: Request, res: Response) => getSubscriptionController().cancelSubscription(req, res)
);

// Cambiar plan
router.put('/plan',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.checkUserStatus,
  (req: Request, res: Response) => getSubscriptionController().changePlan(req, res)
);

// Historial de facturación
router.get('/billing-history',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.checkUserStatus,
  (req: Request, res: Response) => getSubscriptionController().getBillingHistory(req, res)
);

export { router as subscriptionRoutes };