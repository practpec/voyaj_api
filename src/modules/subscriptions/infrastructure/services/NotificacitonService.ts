// src/modules/subscriptions/infrastructure/services/NotificationService.ts
import { LoggerService } from '../../../../shared/services/LoggerService';

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationData {
  userId: string;
  email: string;
  name?: string;
  plan?: string;
  trialEndDate?: Date;
  subscriptionEndDate?: Date;
}

export class NotificationService {
  constructor(private logger: LoggerService) {}

  // Enviar email de bienvenida al crear suscripción
  public async sendWelcomeEmail(data: NotificationData): Promise<void> {
    try {
      const template = this.createWelcomeTemplate(data);
      await this.sendEmail(template);
      
      this.logger.info(`Email de bienvenida enviado a: ${data.email}`);
    } catch (error) {
      this.logger.error('Error enviando email de bienvenida:', error);
      throw error;
    }
  }

  // Enviar notificación de trial próximo a expirar
  public async sendTrialEndingNotification(data: NotificationData): Promise<void> {
    try {
      const template = this.createTrialEndingTemplate(data);
      await this.sendEmail(template);
      
      this.logger.info(`Notificación de trial próximo a expirar enviada a: ${data.email}`);
    } catch (error) {
      this.logger.error('Error enviando notificación de trial:', error);
      throw error;
    }
  }

  // Enviar notificación de suscripción cancelada
  public async sendCancellationNotification(data: NotificationData): Promise<void> {
    try {
      const template = this.createCancellationTemplate(data);
      await this.sendEmail(template);
      
      this.logger.info(`Notificación de cancelación enviada a: ${data.email}`);
    } catch (error) {
      this.logger.error('Error enviando notificación de cancelación:', error);
      throw error;
    }
  }

  // Enviar notificación de pago fallido
  public async sendPaymentFailedNotification(data: NotificationData): Promise<void> {
    try {
      const template = this.createPaymentFailedTemplate(data);
      await this.sendEmail(template);
      
      this.logger.info(`Notificación de pago fallido enviada a: ${data.email}`);
    } catch (error) {
      this.logger.error('Error enviando notificación de pago fallido:', error);
      throw error;
    }
  }

  // Enviar confirmación de pago exitoso
  public async sendPaymentSuccessNotification(data: NotificationData): Promise<void> {
    try {
      const template = this.createPaymentSuccessTemplate(data);
      await this.sendEmail(template);
      
      this.logger.info(`Confirmación de pago enviada a: ${data.email}`);
    } catch (error) {
      this.logger.error('Error enviando confirmación de pago:', error);
      throw error;
    }
  }

  // Plantillas de email privadas
  private createWelcomeTemplate(data: NotificationData): EmailTemplate {
    return {
      to: data.email,
      subject: `¡Bienvenido a Voyaj ${data.plan ? `- Plan ${data.plan}` : ''}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>¡Bienvenido a Voyaj, ${data.name || 'Viajero'}!</h2>
          
          <p>Gracias por unirte a Voyaj. Estamos emocionados de acompañarte en tus próximas aventuras.</p>
          
          ${data.plan ? `
            <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Tu Plan: ${data.plan}</h3>
              <p>Ya puedes comenzar a crear tus viajes y capturar todos esos momentos especiales.</p>
            </div>
          ` : ''}
          
          <h3>¿Qué puedes hacer ahora?</h3>
          <ul>
            <li>Crear tu primer viaje</li>
            <li>Subir fotos de tus aventuras</li>
            <li>Organizar tus recuerdos por ubicación y fecha</li>
          </ul>
          
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          
          <p>¡Felices viajes!<br>El equipo de Voyaj</p>
        </div>
      `,
      text: `¡Bienvenido a Voyaj! Gracias por unirte a nuestra plataforma de viajes.`
    };
  }

  private createTrialEndingTemplate(data: NotificationData): EmailTemplate {
    const daysRemaining = data.trialEndDate ? 
      Math.ceil((data.trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      to: data.email,
      subject: `Tu trial de Voyaj termina en ${daysRemaining} días`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>¡No pierdas el acceso a tus viajes!</h2>
          
          <p>Hola ${data.name || 'Viajero'},</p>
          
          <p>Tu período de trial de Voyaj termina en <strong>${daysRemaining} días</strong>.</p>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>¿Qué sucede después del trial?</h3>
            <p>Tu cuenta se limitará al plan gratuito básico, pero no perderás tus viajes ni fotos.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL}/subscription/upgrade" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
              Continuar con Plan Premium
            </a>
          </div>
          
          <p>¡Gracias por ser parte de Voyaj!</p>
        </div>
      `,
      text: `Tu trial de Voyaj termina en ${daysRemaining} días. Visita ${process.env.APP_URL}/subscription/upgrade para continuar.`
    };
  }

  private createCancellationTemplate(data: NotificationData): EmailTemplate {
    return {
      to: data.email,
      subject: 'Confirmación de cancelación - Voyaj',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Suscripción cancelada</h2>
          
          <p>Hola ${data.name || 'Viajero'},</p>
          
          <p>Hemos procesado la cancelación de tu suscripción ${data.plan || ''} de Voyaj.</p>
          
          <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Acción requerida</h3>
            <p>Por favor actualiza tu método de pago para continuar disfrutando de Voyaj sin interrupciones.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL}/billing/payment-method" 
               style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
              Actualizar Método de Pago
            </a>
          </div>
          
          <p>Si no actualizas tu método de pago, tu cuenta se limitará al plan gratuito.</p>
          
          <p>¡Gracias por tu comprensión!<br>El equipo de Voyaj</p>
        </div>
      `,
      text: `Problema con el pago de tu suscripción de Voyaj. Actualiza tu método de pago en ${process.env.APP_URL}/billing/payment-method`
    };
  }

  private createPaymentSuccessTemplate(data: NotificationData): EmailTemplate {
    return {
      to: data.email,
      subject: 'Pago procesado exitosamente - Voyaj',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>¡Pago procesado exitosamente!</h2>
          
          <p>Hola ${data.name || 'Viajero'},</p>
          
          <p>Hemos procesado exitosamente el pago de tu suscripción ${data.plan || ''} de Voyaj.</p>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>✅ Todo está en orden</h3>
            <p>Tu suscripción se ha renovado y tienes acceso completo a todas las funciones de tu plan.</p>
          </div>
          
          <p>Puedes ver los detalles de tu facturación en tu panel de usuario.</p>
          
          <p>¡Gracias por seguir siendo parte de Voyaj!<br>El equipo de Voyaj</p>
        </div>
      `,
      text: `Pago de suscripción de Voyaj procesado exitosamente. Tu acceso ha sido renovado.`
    };
  }

  // Método para enviar email (implementación mock)
  private async sendEmail(template: EmailTemplate): Promise<void> {
    // Aquí integrarías con tu servicio de email preferido (SendGrid, AWS SES, etc.)
    
    if (process.env.NODE_ENV === 'development') {
      this.logger.info('Email simulado enviado:', {
        to: template.to,
        subject: template.subject,
        html: template.html.substring(0, 100) + '...'
      });
      return;
    }

    // Implementación real del envío de email
    try {
      // await emailService.send(template);
      this.logger.info(`Email enviado a: ${template.to}`);
    } catch (error) {
      this.logger.error('Error enviando email:', error);
      throw error;
    }
  }
}