// src/shared/controllers/BaseController.ts
import { Response } from 'express';
import { LoggerService } from '../services/LoggerService';
import { ResponseUtils } from '../utils/ResponseUtils';

export abstract class BaseController {
  protected logger: LoggerService;

  constructor(logger: LoggerService) {
    this.logger = logger;
  }

  // Respuestas de éxito
  protected ok<T>(res: Response, data?: T, message?: string): void {
    ResponseUtils.success(res, data, message);
  }

  protected created<T>(res: Response, data?: T, message?: string): void {
    ResponseUtils.created(res, data, message);
  }

  protected updated<T>(res: Response, data?: T, message?: string): void {
    ResponseUtils.updated(res, data, message);
  }

  protected deleted(res: Response, message?: string): void {
    ResponseUtils.deleted(res, message);
  }

  protected noContent(res: Response): void {
    ResponseUtils.noContent(res);
  }

  // Respuestas de error
  protected badRequest(res: Response, message: string = 'Petición inválida'): void {
    ResponseUtils.error(res, 400, 'BAD_REQUEST', message);
  }

  protected unauthorized(res: Response, message: string = 'No autorizado'): void {
    ResponseUtils.unauthorized(res, message);
  }

  protected forbidden(res: Response, message: string = 'Acceso prohibido'): void {
    ResponseUtils.forbidden(res, message);
  }

  protected notFound(res: Response, message: string = 'Recurso no encontrado'): void {
    ResponseUtils.notFound(res, message);
  }

  protected conflict(res: Response, message: string = 'Conflicto con el estado actual'): void {
    ResponseUtils.error(res, 409, 'CONFLICT', message);
  }

  protected unprocessableEntity(res: Response, message: string = 'Entidad no procesable'): void {
    ResponseUtils.error(res, 422, 'UNPROCESSABLE_ENTITY', message);
  }

  protected tooManyRequests(res: Response, message: string = 'Demasiadas peticiones'): void {
    ResponseUtils.rateLimitExceeded(res, message);
  }

  protected internalServerError(res: Response, message: string = 'Error interno del servidor'): void {
    ResponseUtils.internalServerError(res, message);
  }

  protected serviceUnavailable(res: Response, message: string = 'Servicio no disponible'): void {
    ResponseUtils.error(res, 503, 'SERVICE_UNAVAILABLE', message);
  }

  // Métodos específicos para casos comunes
  protected validationError(res: Response, errors: any[]): void {
    ResponseUtils.error(res, 400, 'VALIDATION_ERROR', 'Errores de validación', errors);
  }

  protected paymentRequired(res: Response, message: string = 'Pago requerido'): void {
    ResponseUtils.error(res, 402, 'PAYMENT_REQUIRED', message);
  }

  protected subscriptionRequired(res: Response, message: string = 'Suscripción requerida'): void {
    ResponseUtils.error(res, 403, 'SUBSCRIPTION_REQUIRED', message);
  }

  protected planUpgradeRequired(res: Response, requiredPlan: string, currentPlan: string): void {
    ResponseUtils.error(res, 403, 'PLAN_UPGRADE_REQUIRED', 
      `Se requiere plan ${requiredPlan}`, {
        requiredPlan,
        currentPlan
      });
  }
}