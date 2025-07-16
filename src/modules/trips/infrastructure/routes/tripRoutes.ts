// src/modules/trips/infrastructure/routes/tripRoutes.ts
import { Router } from 'express';
import { TripController } from '../controllers/TripController';
import { AuthMiddleware } from '../../../../shared/middleware/AuthMiddleware';
import { ValidationMiddleware } from '../../../../shared/middleware/AuthMiddleware';
import { RateLimitMiddleware } from '../../../../shared/middleware/AuthMiddleware';

const router = Router();
const tripController = new TripController();
const authMiddleware = new AuthMiddleware();
const validationMiddleware = new ValidationMiddleware();
const rateLimitMiddleware = new RateLimitMiddleware();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware.authenticate);

// Rutas básicas de viajes
router.get('/', 
  rateLimitMiddleware.standard,
  tripController.getUserTrips.bind(tripController)
);

router.post('/', 
  rateLimitMiddleware.strict,
  validationMiddleware.validateCreateTrip,
  tripController.createTrip.bind(tripController)
);

router.get('/:id', 
  rateLimitMiddleware.standard,
  validationMiddleware.validateTripId,
  tripController.getTripById.bind(tripController)
);

router.put('/:id', 
  rateLimitMiddleware.standard,
  validationMiddleware.validateTripId,
  validationMiddleware.validateUpdateTrip,
  tripController.updateTrip.bind(tripController)
);

router.delete('/:id', 
  rateLimitMiddleware.standard,
  validationMiddleware.validateTripId,
  tripController.deleteTrip.bind(tripController)
);

router.put('/:id/status', 
  rateLimitMiddleware.standard,
  validationMiddleware.validateTripId,
  validationMiddleware.validateUpdateTripStatus,
  tripController.updateTripStatus.bind(tripController)
);

// Rutas de gestión de miembros
router.get('/:id/members', 
  rateLimitMiddleware.standard,
  validationMiddleware.validateTripId,
  tripController.getTripMembers.bind(tripController)
);

router.post('/:id/invite', 
  rateLimitMiddleware.strict,
  validationMiddleware.validateTripId,
  validationMiddleware.validateInviteMember,
  tripController.inviteUserToTrip.bind(tripController)
);

router.post('/:id/invitation-response', 
  rateLimitMiddleware.standard,
  validationMiddleware.validateTripId,
  validationMiddleware.validateHandleInvitation,
  tripController.handleTripInvitation.bind(tripController)
);

router.put('/:id/members/:userId/role', 
  rateLimitMiddleware.standard,
  validationMiddleware.validateTripId,
  validationMiddleware.validateUserId,
  validationMiddleware.validateUpdateMemberRole,
  tripController.updateMemberRole.bind(tripController)
);

router.delete('/:id/members/:userId', 
  rateLimitMiddleware.standard,
  validationMiddleware.validateTripId,
  validationMiddleware.validateUserId,
  tripController.removeTripMember.bind(tripController)
);

router.post('/:id/leave', 
  rateLimitMiddleware.standard,
  validationMiddleware.validateTripId,
  tripController.leaveTrip.bind(tripController)
);

// Ruta de exportación
router.get('/:id/export', 
  rateLimitMiddleware.lenient, // Más permisivo para exportaciones
  validationMiddleware.validateTripId,
  validationMiddleware.validateExportTrip,
  tripController.exportTrip.bind(tripController)
);

export { router as tripRoutes };