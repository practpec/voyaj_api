import { User } from './User';
import { IUserRepository } from './interfaces/IUserRepository';
import { EmailService } from '../../../shared/services/EmailService';
import { EventBus } from '../../../shared/events/EventBus';
import { UserEvents } from './UserEvents';
import { ErrorHandler } from '../../../shared/utils/ErrorUtils';
import { ValidationUtils } from '../../../shared/utils/ValidationUtils';
import { LoggerService } from '../../../shared/services/LoggerService';

export class UserService {
  constructor(
    private userRepository: IUserRepository,
    private emailService: EmailService,
    private eventBus: EventBus,
    private logger: LoggerService
  ) {}

  // Crear nuevo usuario
  public async createUser(
    email: string,
    password: string,
    name?: string
  ): Promise<{ user: User; verificationCode: string }> {
    // Validar email
    if (!ValidationUtils.validateEmail(email)) {
      throw ErrorHandler.createInvalidEmailError();
    }

    // Validar fortaleza de contraseña
    const passwordValidation = ValidationUtils.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw ErrorHandler.createWeakPasswordError();
    }

    // Verificar si el usuario ya existe
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser && !existingUser.isDeleted) {
      throw ErrorHandler.createUserExistsError();
    }

    // Si existe pero está eliminado, restaurarlo en lugar de crear uno nuevo
    if (existingUser && existingUser.isDeleted) {
      return this.restoreDeletedUser(existingUser, password, name);
    }

    // Crear nuevo usuario
    const user = await User.create(email, password, name);
    const verificationCode = user.generateEmailVerificationCode();

    // Persistir en base de datos
    await this.userRepository.create(user);

    // Publicar evento
    await this.eventBus.publishUserEvent(
      'user.created',
      user.id,
      UserEvents.userCreated({
        userId: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }).eventData
    );

    this.logger.info(`Usuario creado: ${user.email}`, { userId: user.id });

    return { user, verificationCode };
  }

  // Verificar credenciales para login
  public async verifyCredentials(
    email: string,
    password: string,
    ip?: string,
    userAgent?: string
  ): Promise<User> {
    const user = await this.userRepository.findByEmailForAuth(email);
    
    if (!user) {
      throw ErrorHandler.createInvalidCredentialsError();
    }

    if (user.isDeleted) {
      throw ErrorHandler.createUserDeletedError();
    }

    if (user.isBlocked) {
      throw ErrorHandler.createAccountLockedError();
    }

    const isValidPassword = await user.verifyPassword(password);
    
    if (!isValidPassword) {
      // Actualizar intentos fallidos
      await this.userRepository.update(user);
      
      // Si se bloqueó la cuenta, publicar evento
      if (user.isBlocked) {
        await this.eventBus.publishUserEvent(
          'user.account_locked',
          user.id,
          UserEvents.accountLocked({
            userId: user.id,
            email: user.email,
            reason: 'Too many failed login attempts',
            lockedAt: new Date(),
            lockedUntil: user.blockedUntil
          }).eventData
        );
      }
      
      throw ErrorHandler.createInvalidCredentialsError();
    }

    // Actualizar último acceso
    await this.userRepository.update(user);

    // Publicar evento de login exitoso
    await this.eventBus.publishUserEvent(
      'user.logged_in',
      user.id,
      UserEvents.userLoggedIn({
        userId: user.id,
        email: user.email,
        ip: ip || 'unknown',
        userAgent,
        loginAt: new Date()
      }).eventData
    );

    this.logger.logAuth('User login', user.id, user.email, true);

    return user;
  }

  // Verificar email
  public async verifyEmail(email: string, code: string): Promise<User> {
    const user = await this.userRepository.findByVerificationCode(email, code, 'email');
    
    if (!user) {
      throw new Error('Código de verificación inválido o expirado');
    }

    if (user.isDeleted) {
      throw ErrorHandler.createUserDeletedError();
    }

    user.verifyEmail(code);
    await this.userRepository.update(user);

    // Publicar evento
    await this.eventBus.publishUserEvent(
      'user.email_verified',
      user.id,
      UserEvents.emailVerified({
        userId: user.id,
        email: user.email,
        verifiedAt: new Date()
      }).eventData
    );

    this.logger.info(`Email verificado: ${user.email}`, { userId: user.id });

    return user;
  }

  // Reenviar código de verificación
  public async resendVerificationCode(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    
    if (!user) {
      // Por seguridad, no revelamos si el email existe
      return;
    }

    if (user.isDeleted) {
      return;
    }

    if (user.isEmailVerified) {
      throw new Error('El email ya está verificado');
    }

    const verificationCode = user.generateEmailVerificationCode();
    await this.userRepository.update(user);

    // Enviar email
    await this.emailService.sendVerificationEmail(
      user.email,
      {
        name: user.name || 'Usuario',
        verificationCode
      }
    );

    // Publicar evento
    await this.eventBus.publishUserEvent(
      'user.email_verification_requested',
      user.id,
      UserEvents.emailVerificationRequested({
        userId: user.id,
        email: user.email,
        requestedAt: new Date()
      }).eventData
    );

    this.logger.info(`Código de verificación reenviado: ${user.email}`, { userId: user.id });
  }

  // Solicitar recuperación de contraseña
  public async requestPasswordReset(email: string, ip?: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    
    if (!user || user.isDeleted) {
      // Por seguridad, siempre responder con éxito
      return;
    }

    const resetCode = user.generatePasswordResetCode();
    await this.userRepository.update(user);

    // Enviar email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      {
        name: user.name || 'Usuario',
        resetCode
      }
    );

    // Publicar evento
    await this.eventBus.publishUserEvent(
      'user.password_reset_requested',
      user.id,
      UserEvents.passwordResetRequested({
        userId: user.id,
        email: user.email,
        requestedAt: new Date(),
        ip
      }).eventData
    );

    this.logger.info(`Recuperación de contraseña solicitada: ${user.email}`, { userId: user.id });
  }

  // Resetear contraseña
  public async resetPassword(
    email: string,
    code: string,
    newPassword: string,
    ip?: string
  ): Promise<void> {
    // Validar nueva contraseña
    const passwordValidation = ValidationUtils.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw ErrorHandler.createWeakPasswordError();
    }

    const user = await this.userRepository.findByVerificationCode(email, code, 'password');
    
    if (!user) {
      throw new Error('Código de recuperación inválido o expirado');
    }

    if (user.isDeleted) {
      throw ErrorHandler.createUserDeletedError();
    }

    await user.resetPassword(code, newPassword);
    await this.userRepository.update(user);

    // Publicar evento
    await this.eventBus.publishUserEvent(
      'user.password_reset_completed',
      user.id,
      UserEvents.passwordResetCompleted({
        userId: user.id,
        email: user.email,
        completedAt: new Date(),
        ip
      }).eventData
    );

    this.logger.info(`Contraseña restablecida: ${user.email}`, { userId: user.id });
  }

  // Cambiar contraseña
  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ip?: string
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw ErrorHandler.createUserNotFoundError();
    }

    if (user.isDeleted) {
      throw ErrorHandler.createUserDeletedError();
    }

    // Validar nueva contraseña
    const passwordValidation = ValidationUtils.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw ErrorHandler.createWeakPasswordError();
    }

    await user.changePassword(currentPassword, newPassword);
    await this.userRepository.update(user);

    // Enviar email de confirmación
    await this.emailService.sendPasswordChangedEmail(
      user.email,
      user.name || 'Usuario'
    );

    // Publicar evento
    await this.eventBus.publishUserEvent(
      'user.password_changed',
      user.id,
      UserEvents.passwordChanged({
        userId: user.id,
        email: user.email,
        changedAt: new Date(),
        ip
      }).eventData
    );

    this.logger.info(`Contraseña cambiada: ${user.email}`, { userId: user.id });
  }

  // Actualizar perfil
  public async updateProfile(
    userId: string,
    updates: {
      name?: string;
      profilePictureUrl?: string;
    }
  ): Promise<User> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw ErrorHandler.createUserNotFoundError();
    }

    if (user.isDeleted) {
      throw ErrorHandler.createUserDeletedError();
    }

    const oldName = user.name;
    const oldProfilePicture = user.profilePictureUrl;

    user.updateProfile(updates.name, updates.profilePictureUrl);
    await this.userRepository.update(user);

    // Publicar evento si hubo cambios
    const changes: any = {};
    if (updates.name !== undefined && updates.name !== oldName) {
      changes.name = { from: oldName, to: updates.name };
    }
    if (updates.profilePictureUrl !== undefined && updates.profilePictureUrl !== oldProfilePicture) {
      changes.profilePicture = { from: oldProfilePicture, to: updates.profilePictureUrl };
    }

    if (Object.keys(changes).length > 0) {
      await this.eventBus.publishUserEvent(
        'user.updated',
        user.id,
        UserEvents.userUpdated({
          userId: user.id,
          email: user.email,
          changes,
          updatedAt: new Date()
        }).eventData
      );
    }

    this.logger.info(`Perfil actualizado: ${user.email}`, { userId: user.id, changes });

    return user;
  }

  // Eliminar cuenta
  public async deleteAccount(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw ErrorHandler.createUserNotFoundError();
    }

    if (user.isDeleted) {
      throw new Error('La cuenta ya está eliminada');
    }

    user.markAsDeleted();
    await this.userRepository.update(user);

    // Enviar email de despedida
    await this.emailService.sendAccountDeletedEmail(
      user.email,
      user.name || 'Usuario'
    );

    // Publicar evento
    await this.eventBus.publishUserEvent(
      'user.deleted',
      user.id,
      UserEvents.userDeleted({
        userId: user.id,
        email: user.email,
        deletedAt: new Date()
      }).eventData
    );

    this.logger.info(`Cuenta eliminada: ${user.email}`, { userId: user.id });
  }

  // Restaurar usuario eliminado (solo admin)
  public async restoreUser(userId: string, restoredBy?: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw ErrorHandler.createUserNotFoundError();
    }

    if (!user.isDeleted) {
      throw new Error('La cuenta no está eliminada');
    }

    user.restore();
    await this.userRepository.update(user);

    // Publicar evento
    await this.eventBus.publishUserEvent(
      'user.restored',
      user.id,
      UserEvents.userRestored({
        userId: user.id,
        email: user.email,
        restoredAt: new Date(),
        restoredBy
      }).eventData
    );

    this.logger.info(`Usuario restaurado: ${user.email}`, { 
      userId: user.id, 
      restoredBy 
    });

    return user;
  }

  // Logout (invalidar refresh token)
  public async logout(userId: string, refreshToken: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    
    if (user) {
      user.removeRefreshToken(refreshToken);
      await this.userRepository.update(user);

      // Publicar evento
      await this.eventBus.publishUserEvent(
        'user.logged_out',
        user.id,
        UserEvents.userLoggedOut({
          userId: user.id,
          email: user.email,
          logoutAt: new Date()
        }).eventData
      );

      this.logger.logAuth('User logout', user.id, user.email, true);
    }
  }

  // Validar disponibilidad de email
  public async isEmailAvailable(email: string): Promise<boolean> {
    const user = await this.userRepository.findByEmail(email);
    return !user || user.isDeleted;
  }

  // Obtener estadísticas de usuarios
  public async getUserStats(): Promise<{
    total: number;
    active: number;
    deleted: number;
    verified: number;
    blocked: number;
  }> {
    const [total, active, deleted, verified, blocked] = await Promise.all([
      this.userRepository.countTotal(),
      this.userRepository.countActive(),
      this.userRepository.countDeleted(),
      this.userRepository.countVerified(),
      this.userRepository.countBlocked()
    ]);

    return { total, active, deleted, verified, blocked };
  }

  // Limpiar códigos expirados (tarea de mantenimiento)
  public async cleanupExpiredCodes(): Promise<{
    emailCodes: number;
    passwordCodes: number;
  }> {
    const [emailCodes, passwordCodes] = await Promise.all([
      this.userRepository.cleanExpiredVerificationCodes(),
      this.userRepository.cleanExpiredPasswordResetCodes()
    ]);

    this.logger.info('Códigos expirados limpiados', { emailCodes, passwordCodes });

    return { emailCodes, passwordCodes };
  }

  // Limpiar usuarios eliminados antiguos (tarea de mantenimiento)
  public async cleanupOldDeletedUsers(daysOld: number = 30): Promise<number> {
    const cleaned = await this.userRepository.cleanOldDeletedUsers(daysOld);
    
    this.logger.info(`Usuarios eliminados antiguos limpiados: ${cleaned}`, { daysOld });
    
    return cleaned;
  }

  // Método privado para restaurar usuario eliminado
  private async restoreDeletedUser(
    existingUser: User,
    newPassword: string,
    name?: string
  ): Promise<{ user: User; verificationCode: string }> {
    // Restaurar usuario
    existingUser.restore();
    
    // Actualizar contraseña
    await existingUser.changePassword(existingUser.password, newPassword);
    
    // Actualizar nombre si se proporciona
    if (name) {
      existingUser.updateProfile(name);
    }

    // Generar nuevo código de verificación
    const verificationCode = existingUser.generateEmailVerificationCode();

    // Actualizar en base de datos
    await this.userRepository.update(existingUser);

    // Publicar evento de restauración
    await this.eventBus.publishUserEvent(
      'user.restored',
      existingUser.id,
      UserEvents.userRestored({
        userId: existingUser.id,
        email: existingUser.email,
        restoredAt: new Date()
      }).eventData
    );

    this.logger.info(`Usuario eliminado restaurado: ${existingUser.email}`, { 
      userId: existingUser.id 
    });

    return { user: existingUser, verificationCode };
  }
}