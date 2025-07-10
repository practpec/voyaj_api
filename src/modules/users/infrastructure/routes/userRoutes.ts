// src/modules/users/infrastructure/routes/userRoutes.ts
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { AuthMiddleware } from '../../../../shared/middleware/AuthMiddleware';
import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../../../../shared/constants';

const router = Router();

// Inicialización lazy del controlador para evitar problemas de conexión DB
let userController: UserController | null = null;

const getUserController = (): UserController => {
  if (!userController) {
    userController = new UserController();
  }
  return userController;
};

// Rate limiting específico por endpoint
const loginLimiter = rateLimit({
  windowMs: RATE_LIMITS.LOGIN.windowMs,
  max: RATE_LIMITS.LOGIN.max,
  message: {
    error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: RATE_LIMITS.REGISTER.windowMs,
  max: RATE_LIMITS.REGISTER.max,
  message: {
    error: 'Demasiados intentos de registro. Intenta de nuevo en 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const forgotPasswordLimiter = rateLimit({
  windowMs: RATE_LIMITS.FORGOT_PASSWORD.windowMs,
  max: RATE_LIMITS.FORGOT_PASSWORD.max,
  message: {
    error: 'Demasiadas solicitudes de recuperación. Intenta de nuevo en 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: RATE_LIMITS.GENERAL.windowMs,
  max: RATE_LIMITS.GENERAL.max,
  message: {
    error: 'Demasiadas peticiones. Intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================================================
// RUTAS DEL SISTEMA (DEBEN IR PRIMERO para evitar conflictos)
// ============================================================================

// Health check
router.get('/health', (req, res) => 
  getUserController().healthCheck(req, res)
);

// Información de la API (raíz)
router.get('/', (req, res) => 
  getUserController().apiInfo(req, res)
);

// Búsqueda de usuarios (ANTES de /:id para evitar conflictos)
router.get('/search', 
  generalLimiter,
  AuthMiddleware.optionalAuthenticate,
  (req, res) => getUserController().searchUsers(req, res)
);

// Estadísticas de usuarios (solo admin) - ANTES de /:id
router.get('/admin/stats',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  (req, res) => getUserController().getUserStats(req, res)
);

// ============================================================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================================================

// Autenticación
router.post('/register', registerLimiter, (req, res) => 
  getUserController().register(req, res)
);

router.post('/login', loginLimiter, (req, res) => 
  getUserController().login(req, res)
);

router.post('/refresh-token', generalLimiter, (req, res) => 
  getUserController().refreshToken(req, res)
);

// Recuperación de contraseña
router.post('/forgot-password', forgotPasswordLimiter, (req, res) => 
  getUserController().forgotPassword(req, res)
);

router.post('/reset-password', generalLimiter, (req, res) => 
  getUserController().resetPassword(req, res)
);

// Verificación de email
router.post('/verify-email', generalLimiter, (req, res) => 
  getUserController().verifyEmail(req, res)
);

router.post('/resend-verification', generalLimiter, (req, res) => 
  getUserController().resendVerification(req, res)
);

// ============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================================================

// Logout
router.post('/logout',
  generalLimiter,
  AuthMiddleware.authenticate,
  (req, res) => getUserController().logout(req, res)
);

// Gestión de perfil
router.get('/profile',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.checkUserStatus,
  (req, res) => getUserController().getProfile(req, res)
);

router.put('/profile',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.checkUserStatus,
  (req, res) => getUserController().updateProfile(req, res)
);

// Cambio de contraseña
router.put('/change-password',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.checkUserStatus,
  (req, res) => getUserController().changePassword(req, res)
);

// Eliminación de cuenta
router.delete('/account',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.checkUserStatus,
  (req, res) => getUserController().deleteAccount(req, res)
);

// ============================================================================
// RUTAS CON PARÁMETROS (DEBEN IR AL FINAL)
// ============================================================================

// Restaurar usuario eliminado (solo admin)
router.post('/:id/restore',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  (req, res) => getUserController().restoreUser(req, res)
);

// Información pública de usuarios (DEBE IR AL FINAL para no capturar otras rutas)
router.get('/:id', generalLimiter, (req, res) => 
  getUserController().getUserById(req, res)
);

// Exportación principal
export { router as userRoutes };

// Exportación adicional para compatibilidad con require()
module.exports = { userRoutes: router };
module.exports.default = router;