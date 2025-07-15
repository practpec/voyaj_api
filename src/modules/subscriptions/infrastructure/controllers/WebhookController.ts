// src/modules/subscriptions/infrastructure/controllers/WebhookController.ts
import { Request, Response } from 'express';
import { ProcessWebhookUseCase } from '../../application/useCases/ProcessWebhook';
import { BaseController } from '../../../../shared/controllers/BaseController';
import { LoggerService } from '../../../../shared/services/LoggerService';

export class WebhookController extends BaseController {
  constructor(
    private processWebhookUseCase: ProcessWebhookUseCase,
    protected logger: LoggerService
  ) {
    super(logger);
  }

  // Procesar webhook de Stripe
  public async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!signature) {
        return this.badRequest(res, 'Firma de webhook faltante');
      }

      if (!endpointSecret) {
        this.logger.error('STRIPE_WEBHOOK_SECRET no configurado');
        return this.internalServerError(res, 'Configuración de webhook incompleta');
      }

      // El payload ya viene como string en req.body cuando se usa raw parser
      const payload = req.body;

      await this.processWebhookUseCase.execute({
        payload,
        signature,
        endpointSecret
      });

      // Stripe requiere respuesta 200 para confirmar recepción
      this.ok(res, { received: true });

    } catch (error) {
      this.logger.error('Error procesando webhook de Stripe:', error);
      
      // Si es error de verificación de firma, responder 400
      if (error instanceof Error && error.message.includes('signature')) {
        return this.badRequest(res, 'Firma de webhook inválida');
      }

      // Para otros errores, responder 500 para que Stripe reintente
      this.internalServerError(res, 'Error procesando webhook');
    }
  }

  // Verificar estado del webhook (para debugging)
  public async getWebhookStatus(req: Request, res: Response): Promise<void> {
    try {
      const webhookConfig = {
        endpointConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      };

      this.ok(res, webhookConfig);
    } catch (error) {
      this.logger.error('Error obteniendo estado del webhook:', error);
      this.internalServerError(res, 'Error interno del servidor');
    }
  }
}