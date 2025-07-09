import nodemailer from 'nodemailer';
import { LoggerService } from './LoggerService';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface WelcomeEmailData {
  name: string;
  verificationCode: string;
}

export interface PasswordResetData {
  name: string;
  resetCode: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter!: nodemailer.Transporter; // Usar definite assignment assertion
  private logger: LoggerService;

  private constructor() {
    this.logger = LoggerService.getInstance();
    this.setupTransporter();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private setupTransporter(): void {
    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

    // Corregir: usar createTransport en lugar de createTransporter
    this.transporter = nodemailer.createTransport(config);
  }

  // Método genérico para enviar emails
  public async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: `"Voyaj" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.info(`Email enviado exitosamente a ${options.to}`);
    } catch (error) {
      this.logger.error(`Error enviando email a ${options.to}:`, error);
      throw new Error('Error enviando email');
    }
  }

  // Email de bienvenida con código de verificación
  public async sendWelcomeEmail(email: string, data: WelcomeEmailData): Promise<void> {
    const html = this.generateWelcomeEmailTemplate(data);
    const text = `¡Bienvenido a Voyaj, ${data.name}! Tu código de verificación es: ${data.verificationCode}`;

    await this.sendEmail({
      to: email,
      subject: '¡Bienvenido a Voyaj! - Verifica tu cuenta',
      html,
      text
    });
  }

  // Email de verificación de cuenta
  public async sendVerificationEmail(email: string, data: WelcomeEmailData): Promise<void> {
    const html = this.generateVerificationEmailTemplate(data);
    const text = `Hola ${data.name}, tu código de verificación es: ${data.verificationCode}`;

    await this.sendEmail({
      to: email,
      subject: 'Verifica tu cuenta - Voyaj',
      html,
      text
    });
  }

  // Email de recuperación de contraseña
  public async sendPasswordResetEmail(email: string, data: PasswordResetData): Promise<void> {
    const html = this.generatePasswordResetTemplate(data);
    const text = `Hola ${data.name}, tu código de recuperación es: ${data.resetCode}`;

    await this.sendEmail({
      to: email,
      subject: 'Recuperación de contraseña - Voyaj',
      html,
      text
    });
  }

  // Email de confirmación de cambio de contraseña
  public async sendPasswordChangedEmail(email: string, name: string): Promise<void> {
    const html = this.generatePasswordChangedTemplate(name);
    const text = `Hola ${name}, tu contraseña ha sido cambiada exitosamente.`;

    await this.sendEmail({
      to: email,
      subject: 'Contraseña cambiada - Voyaj',
      html,
      text
    });
  }

  // Email de cuenta eliminada
  public async sendAccountDeletedEmail(email: string, name: string): Promise<void> {
    const html = this.generateAccountDeletedTemplate(name);
    const text = `Adiós ${name}, tu cuenta ha sido eliminada. ¡Esperamos verte pronto!`;

    await this.sendEmail({
      to: email,
      subject: 'Cuenta eliminada - Voyaj',
      html,
      text
    });
  }

  // Plantilla de email de bienvenida
  private generateWelcomeEmailTemplate(data: WelcomeEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .code { background: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; color: #1976d2; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Bienvenido a Voyaj!</h1>
            <p>Tu plataforma para planificar viajes increíbles</p>
          </div>
          <div class="content">
            <h2>¡Hola ${data.name}!</h2>
            <p>Estamos emocionados de tenerte en nuestra comunidad de viajeros. Para completar tu registro, por favor verifica tu cuenta con el siguiente código:</p>
            <div class="code">${data.verificationCode}</div>
            <p>Este código expira en 24 horas.</p>
            <p>Si no solicitaste esta cuenta, puedes ignorar este email.</p>
          </div>
          <div class="footer">
            <p>© 2025 Voyaj. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Plantilla de verificación de email
  private generateVerificationEmailTemplate(data: WelcomeEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #4CAF50; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .code { background: #e8f5e8; padding: 20px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; color: #2e7d32; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verificación de Email</h1>
          </div>
          <div class="content">
            <h2>Hola ${data.name},</h2>
            <p>Aquí tienes tu nuevo código de verificación:</p>
            <div class="code">${data.verificationCode}</div>
            <p>Este código expira en 24 horas.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Plantilla de recuperación de contraseña
  private generatePasswordResetTemplate(data: PasswordResetData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #ff9800; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .code { background: #fff3e0; padding: 20px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; color: #f57c00; margin: 20px 0; }
          .warning { background: #ffebee; padding: 15px; border-radius: 5px; color: #c62828; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Recuperación de Contraseña</h1>
          </div>
          <div class="content">
            <h2>Hola ${data.name},</h2>
            <p>Recibimos una solicitud para recuperar tu contraseña. Usa el siguiente código:</p>
            <div class="code">${data.resetCode}</div>
            <div class="warning">
              <strong>⚠️ Importante:</strong> Este código expira en 10 minutos por seguridad.
            </div>
            <p>Si no solicitaste este cambio, ignora este email y tu contraseña permanecerá sin cambios.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Plantilla de contraseña cambiada
  private generatePasswordChangedTemplate(name: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #4CAF50; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .success { background: #e8f5e8; padding: 15px; border-radius: 5px; color: #2e7d32; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Contraseña Actualizada</h1>
          </div>
          <div class="content">
            <h2>Hola ${name},</h2>
            <div class="success">
              ✅ Tu contraseña ha sido cambiada exitosamente.
            </div>
            <p>Tu cuenta ahora está protegida con tu nueva contraseña.</p>
            <p>Si no realizaste este cambio, contacta con nuestro soporte inmediatamente.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Plantilla de cuenta eliminada
  private generateAccountDeletedTemplate(name: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #757575; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Hasta pronto, ${name}</h1>
          </div>
          <div class="content">
            <p>Tu cuenta en Voyaj ha sido eliminada según tu solicitud.</p>
            <p>Lamentamos verte partir y esperamos que hayas disfrutado tu tiempo con nosotros.</p>
            <p>Si cambias de opinión, siempre serás bienvenido de vuelta.</p>
            <p>¡Que tengas increíbles aventuras!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}