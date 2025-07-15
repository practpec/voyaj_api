// src/modules/subscriptions/infrastructure/routes/subscriptionRoutes.ts
import { Router } from 'express';
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

// Rate limiting específico
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: {
    error: 'Demasiadas peticiones. Intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================================================
// RUTAS PÚBLICAS (webhooks)
// ============================================================================

// Webhook de Stripe
router.post('/webhook/stripe',
  (req, res) => getSubscriptionController().handleWebhook(req, res)
);

// ============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================================================

// Middleware de autenticación para todas las rutas siguientes
router.use(generalLimiter);
router.use(AuthMiddleware.authenticate);

// Obtener suscripción actual del usuario
router.get('/current',
  (req, res) => getSubscriptionController().getCurrentSubscription(req, res)
);

// Crear nueva suscripción
router.post('/',
  (req, res) => getSubscriptionController().createSubscription(req, res)
);

// Actualizar suscripción (cambiar plan)
router.put('/:id',
  (req, res) => getSubscriptionController().updateSubscription(req, res)
);

// Cancelar suscripción
router.post('/cancel',
  (req, res) => getSubscriptionController().cancelSubscription(req, res)
);

// Obtener planes disponibles
router.get('/plans',
  (req, res) => getSubscriptionController().getAvailablePlans(req, res)
);

// Crear sesión de checkout de Stripe
router.post('/checkout-session',
  (req, res) => getSubscriptionController().createCheckoutSession(req, res)
);

// Obtener portal de facturación de Stripe
router.post('/billing-portal',
  (req, res) => getSubscriptionController().createBillingPortalSession(req, res)
);

// Obtener historial de facturación
router.get('/billing-history',
  (req, res) => getSubscriptionController().getBillingHistory(req, res)
);

// ============================================================================
// RUTAS ADMINISTRATIVAS (requieren rol admin)
// ============================================================================

// Estadísticas de suscripciones (solo admin)
router.get('/admin/stats',
  AuthMiddleware.requireAdmin,
  (req, res) => getSubscriptionController().getSubscriptionStats(req, res)
);

// Limpiar suscripciones expiradas (solo admin)
router.post('/admin/cleanup',
  AuthMiddleware.requireAdmin,
  (req, res) => getSubscriptionController().cleanupExpiredSubscriptions(req, res)
);

export { router as subscriptionRoutes };