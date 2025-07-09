import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { AuthMiddleware } from '../../../../shared/middleware/AuthMiddleware';
import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../../../../shared/constants';

const router = Router();
const userController = new UserController();

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
// RUTAS PÚBLICAS (sin autenticación)
// ============================================================================

// Autenticación
router.post('/register', registerLimiter, userController.register);
router.post('/login', loginLimiter, userController.login);
router.post('/refresh-token', generalLimiter, userController.refreshToken);

// Recuperación de contraseña
router.post('/forgot-password', forgotPasswordLimiter, userController.forgotPassword);
router.post('/reset-password', generalLimiter, userController.resetPassword);

// Verificación de email
router.post('/verify-email', generalLimiter, userController.verifyEmail);
router.post('/resend-verification', generalLimiter, userController.resendVerification);

// Información pública de usuarios
router.get('/:id', generalLimiter, userController.getUserById);

// Búsqueda de usuarios (opcional auth)
router.get('/search', 
  generalLimiter,
  AuthMiddleware.optionalAuthenticate,
  userController.searchUsers
);

// ============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================================================

// Logout
router.post('/logout',
  generalLimiter,
  AuthMiddleware.authenticate,
  userController.logout
);

// Gestión de perfil
router.get('/profile',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.checkUserStatus,
  userController.getProfile
);

router.put('/profile',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.checkUserStatus,
  userController.updateProfile
);

// Cambio de contraseña
router.put('/change-password',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.checkUserStatus,
  userController.changePassword
);

// Eliminación de cuenta
router.delete('/account',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.checkUserStatus,
  userController.deleteAccount
);

// ============================================================================
// RUTAS DE ADMINISTRADOR
// ============================================================================

// Estadísticas de usuarios (solo admin)
router.get('/admin/stats',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  userController.getUserStats
);

// Restaurar usuario eliminado (solo admin)
router.post('/:id/restore',
  generalLimiter,
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  userController.restoreUser
);

// ============================================================================
// RUTAS DEL SISTEMA
// ============================================================================

// Health check
router.get('/health', userController.healthCheck);

// Información de la API
router.get('/', userController.apiInfo);

export { router as userRoutes };