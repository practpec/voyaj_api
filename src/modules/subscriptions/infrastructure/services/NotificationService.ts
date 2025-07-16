// src/modules/subscriptions/infrastructure/services/NotificationService.ts
import { LoggerService } from '../../../../shared/services/LoggerService';
import { EmailService } from '../../../../shared/services/EmailService';

export class NotificationService {
  private static instance: NotificationService;
  private logger: LoggerService;
  private emailService: EmailService;

  private constructor() {
    this.logger = LoggerService.getInstance();
    this.emailService = EmailService.getInstance();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Notificar suscripción creada
  public async notifySubscriptionCreated(userId: string, planCode: string): Promise<void> {
    try {
      this.logger.info(`Notificando suscripción creada: usuario ${userId}, plan ${planCode}`);
    } catch (error) {
      this.logger.error('Error enviando notificación de suscripción creada:', error);
    }
  }

  // Notificar suscripción cancelada
  public async notifySubscriptionCanceled(userId: string, planCode: string): Promise<void> {
    try {
      this.logger.info(`Notificando suscripción cancelada: usuario ${userId}, plan ${planCode}`);
    } catch (error) {
      this.logger.error('Error enviando notificación de suscripción cancelada:', error);
    }
  }

  // Notificar trial próximo a expirar
  public async notifyTrialEndingSoon(userId: string, daysRemaining: number): Promise<void> {
    try {
      this.logger.info(`Notificando trial próximo a expirar: usuario ${userId}, ${daysRemaining} días restantes`);
    } catch (error) {
      this.logger.error('Error enviando notificación de trial próximo a expirar:', error);
    }
  }

  // Notificar pago fallido
  public async notifyPaymentFailed(userId: string, amount: number, currency: string): Promise<void> {
    try {
      this.logger.info(`Notificando pago fallido: usuario ${userId}, monto ${amount} ${currency}`);
    } catch (error) {
      this.logger.error('Error enviando notificación de pago fallido:', error);
    }
  }

  // Notificar cambio de plan
  public async notifyPlanChanged(userId: string, oldPlan: string, newPlan: string): Promise<void> {
    try {
      this.logger.info(`Notificando cambio de plan: usuario ${userId}, de ${oldPlan} a ${newPlan}`);
    } catch (error) {
      this.logger.error('Error enviando notificación de cambio de plan:', error);
    }
  }
}