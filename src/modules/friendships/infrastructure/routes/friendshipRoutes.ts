// src/modules/friendships/infrastructure/routes/friendshipRoutes.ts
import { Router } from 'express';
import { FriendshipController } from '../controllers/FriendshipController';
import { AuthMiddleware } from '../../../../shared/middleware/AuthMiddleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Inicialización lazy del controlador
let friendshipController: FriendshipController | null = null;

const getFriendshipController = (): FriendshipController => {
  if (!friendshipController) {
    friendshipController = new FriendshipController();
  }
  return friendshipController;
};

// Rate limiting específico para amistades
const friendshipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50,
  message: {
    error: 'Demasiadas peticiones de amistad. Intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const requestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // Máximo 20 solicitudes por hora
  message: {
    error: 'Demasiadas solicitudes de amistad enviadas. Intenta de nuevo en 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware de autenticación para todas las rutas
router.use(AuthMiddleware.authenticate);
router.use(friendshipLimiter);

// ============================================================================
// RUTAS DE GESTIÓN DE AMISTADES
// ============================================================================

// Enviar solicitud de amistad
router.post('/request',
  requestLimiter,
  (req, res) => getFriendshipController().sendFriendRequest(req, res)
);

// Aceptar solicitud de amistad
router.post('/:id/accept',
  (req, res) => getFriendshipController().acceptFriendRequest(req, res)
);

// Rechazar solicitud de amistad
router.post('/:id/reject',
  (req, res) => getFriendshipController().rejectFriendRequest(req, res)
);

// Eliminar amistad
router.delete('/:id',
  (req, res) => getFriendshipController().removeFriendship(req, res)
);

// ============================================================================
// RUTAS DE CONSULTA
// ============================================================================

// Obtener lista de amigos
router.get('/',
  (req, res) => getFriendshipController().getUserFriends(req, res)
);

// Obtener solicitudes recibidas
router.get('/requests/received',
  (req, res) => getFriendshipController().getFriendRequests(req, res)
);

// Obtener solicitudes enviadas
router.get('/requests/sent',
  (req, res) => getFriendshipController().getFriendRequests(req, res)
);

// Obtener sugerencias de amigos
router.get('/suggestions',
  (req, res) => getFriendshipController().getFriendSuggestions(req, res)
);

// Obtener estadísticas de amistad
router.get('/stats',
  (req, res) => getFriendshipController().getFriendshipStats(req, res)
);

export { router as friendshipRoutes };