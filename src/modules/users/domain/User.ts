import { SecurityUtils } from '../../../shared/utils/SecurityUtils';
import { APP_LIMITS } from '../../../shared/constants/index';

export interface UserData {
  id: string;
  correo_electronico: string;
  password: string;
  nombre?: string;
  url_foto_perfil?: string;
  esta_eliminado: boolean;
  creado_en: Date;
  modificado_en?: Date;
  
  // Campos adicionales para la lógica de negocio
  email_verificado: boolean;
  ultimo_acceso?: Date;
  intentos_login_fallidos: number;
  bloqueado_hasta?: Date;
  codigo_verificacion_email?: string;
  codigo_verificacion_email_expira?: Date;
  codigo_recuperacion_password?: string;
  codigo_recuperacion_password_expira?: Date;
  refresh_tokens: string[];
}

export class User {
  private data: UserData;

  constructor(userData: UserData) {
    this.data = { ...userData };
    this.validate();
  }

  // Getters
  public get id(): string {
    return this.data.id;
  }

  public get email(): string {
    return this.data.correo_electronico;
  }

  public get password(): string {
    return this.data.password;
  }

  public get name(): string | undefined {
    return this.data.nombre;
  }

  public get profilePictureUrl(): string | undefined {
    return this.data.url_foto_perfil;
  }

  public get isDeleted(): boolean {
    return this.data.esta_eliminado;
  }

  public get createdAt(): Date {
    return this.data.creado_en;
  }

  public get modifiedAt(): Date | undefined {
    return this.data.modificado_en;
  }

  public get isEmailVerified(): boolean {
    return this.data.email_verificado;
  }

  public get lastAccess(): Date | undefined {
    return this.data.ultimo_acceso;
  }

  public get loginFailedAttempts(): number {
    return this.data.intentos_login_fallidos;
  }

  public get isBlocked(): boolean {
    return this.data.bloqueado_hasta ? this.data.bloqueado_hasta > new Date() : false;
  }

  public get blockedUntil(): Date | undefined {
    return this.data.bloqueado_hasta;
  }

  public get refreshTokens(): string[] {
    return [...this.data.refresh_tokens];
  }

  // Métodos de negocio
  public static async create(
    email: string,
    password: string,
    name?: string
  ): Promise<User> {
    const hashedPassword = await SecurityUtils.hashPassword(password);
    const userId = SecurityUtils.generateUUID();

    const userData: UserData = {
      id: userId,
      correo_electronico: email.toLowerCase().trim(),
      password: hashedPassword,
      nombre: name?.trim(),
      url_foto_perfil: undefined,
      esta_eliminado: false,
      creado_en: new Date(),
      modificado_en: undefined,
      email_verificado: false,
      ultimo_acceso: undefined,
      intentos_login_fallidos: 0,
      bloqueado_hasta: undefined,
      codigo_verificacion_email: undefined,
      codigo_verificacion_email_expira: undefined,
      codigo_recuperacion_password: undefined,
      codigo_recuperacion_password_expira: undefined,
      refresh_tokens: []
    };

    return new User(userData);
  }

  // Verificar contraseña
  public async verifyPassword(password: string): Promise<boolean> {
    if (this.isBlocked) {
      throw new Error('Usuario bloqueado');
    }

    if (this.data.esta_eliminado) {
      throw new Error('Usuario eliminado');
    }

    const isValid = await SecurityUtils.verifyPassword(password, this.data.password);
    
    if (isValid) {
      this.resetLoginAttempts();
      this.updateLastAccess();
    } else {
      this.incrementLoginAttempts();
    }

    return isValid;
  }

  // Cambiar contraseña
  public async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const isCurrentValid = await SecurityUtils.verifyPassword(currentPassword, this.data.password);
    
    if (!isCurrentValid) {
      throw new Error('Contraseña actual incorrecta');
    }

    if (currentPassword === newPassword) {
      throw new Error('La nueva contraseña debe ser diferente a la actual');
    }

    this.data.password = await SecurityUtils.hashPassword(newPassword);
    this.data.modificado_en = new Date();
    
    // Invalidar todos los refresh tokens
    this.data.refresh_tokens = [];
  }

  // Actualizar perfil
  public updateProfile(name?: string, profilePictureUrl?: string): void {
    if (name !== undefined) {
      this.data.nombre = name.trim() || undefined;
    }

    if (profilePictureUrl !== undefined) {
      this.data.url_foto_perfil = profilePictureUrl || undefined;
    }

    this.data.modificado_en = new Date();
  }

  // Generar código de verificación de email
  public generateEmailVerificationCode(): string {
    const code = SecurityUtils.generateSecureCode(APP_LIMITS.EMAIL_VERIFICATION_CODE_LENGTH);
    const expiresAt = new Date(Date.now() + APP_LIMITS.EMAIL_VERIFICATION_EXPIRY);

    this.data.codigo_verificacion_email = code;
    this.data.codigo_verificacion_email_expira = expiresAt;
    this.data.modificado_en = new Date();

    return code;
  }

  // Verificar email con código
  public verifyEmail(code: string): boolean {
    if (!this.data.codigo_verificacion_email) {
      throw new Error('No hay código de verificación pendiente');
    }

    if (!this.data.codigo_verificacion_email_expira || 
        this.data.codigo_verificacion_email_expira < new Date()) {
      throw new Error('Código de verificación expirado');
    }

    if (this.data.codigo_verificacion_email !== code) {
      throw new Error('Código de verificación inválido');
    }

    this.data.email_verificado = true;
    this.data.codigo_verificacion_email = undefined;
    this.data.codigo_verificacion_email_expira = undefined;
    this.data.modificado_en = new Date();

    return true;
  }

  // Generar código de recuperación de contraseña
  public generatePasswordResetCode(): string {
    const code = SecurityUtils.generateSecureCode(APP_LIMITS.PASSWORD_RESET_CODE_LENGTH);
    const expiresAt = new Date(Date.now() + APP_LIMITS.PASSWORD_RESET_EXPIRY);

    this.data.codigo_recuperacion_password = code;
    this.data.codigo_recuperacion_password_expira = expiresAt;
    this.data.modificado_en = new Date();

    return code;
  }

  // Verificar y resetear contraseña
  public async resetPassword(code: string, newPassword: string): Promise<void> {
    if (!this.data.codigo_recuperacion_password) {
      throw new Error('No hay código de recuperación pendiente');
    }

    if (!this.data.codigo_recuperacion_password_expira || 
        this.data.codigo_recuperacion_password_expira < new Date()) {
      throw new Error('Código de recuperación expirado');
    }

    if (this.data.codigo_recuperacion_password !== code) {
      throw new Error('Código de recuperación inválido');
    }

    this.data.password = await SecurityUtils.hashPassword(newPassword);
    this.data.codigo_recuperacion_password = undefined;
    this.data.codigo_recuperacion_password_expira = undefined;
    this.data.modificado_en = new Date();
    
    // Invalidar todos los refresh tokens
    this.data.refresh_tokens = [];
    
    // Resetear intentos de login
    this.resetLoginAttempts();
  }

  // Manejar refresh tokens
  public addRefreshToken(token: string): void {
    this.data.refresh_tokens.push(token);
    this.data.modificado_en = new Date();
  }

  public removeRefreshToken(token: string): void {
    this.data.refresh_tokens = this.data.refresh_tokens.filter(t => t !== token);
    this.data.modificado_en = new Date();
  }

  public clearAllRefreshTokens(): void {
    this.data.refresh_tokens = [];
    this.data.modificado_en = new Date();
  }

  // Soft delete
  public markAsDeleted(): void {
    this.data.esta_eliminado = true;
    this.data.modificado_en = new Date();
    this.clearAllRefreshTokens();
  }

  // Restaurar usuario eliminado
  public restore(): void {
    this.data.esta_eliminado = false;
    this.data.modificado_en = new Date();
  }

  // Métodos privados
  private incrementLoginAttempts(): void {
    this.data.intentos_login_fallidos += 1;
    
    if (this.data.intentos_login_fallidos >= APP_LIMITS.MAX_LOGIN_ATTEMPTS) {
      this.data.bloqueado_hasta = new Date(Date.now() + APP_LIMITS.LOGIN_LOCK_DURATION);
    }
    
    this.data.modificado_en = new Date();
  }

  private resetLoginAttempts(): void {
    this.data.intentos_login_fallidos = 0;
    this.data.bloqueado_hasta = undefined;
    this.data.modificado_en = new Date();
  }

  private updateLastAccess(): void {
    this.data.ultimo_acceso = new Date();
    this.data.modificado_en = new Date();
  }

  private validate(): void {
    if (!this.data.id) {
      throw new Error('ID de usuario requerido');
    }

    if (!this.data.correo_electronico) {
      throw new Error('Email requerido');
    }

    if (!this.data.password) {
      throw new Error('Contraseña requerida');
    }

    if (!this.data.creado_en) {
      throw new Error('Fecha de creación requerida');
    }
  }

  // Convertir a objeto plano para persistencia
  public toData(): UserData {
    return { ...this.data };
  }

  // Convertir a objeto público (sin datos sensibles)
  public toPublicData(): {
    id: string;
    correo_electronico: string;
    nombre?: string;
    url_foto_perfil?: string;
    email_verificado: boolean;
    creado_en: Date;
    ultimo_acceso?: Date;
  } {
    return {
      id: this.data.id,
      correo_electronico: this.data.correo_electronico,
      nombre: this.data.nombre,
      url_foto_perfil: this.data.url_foto_perfil,
      email_verificado: this.data.email_verificado,
      creado_en: this.data.creado_en,
      ultimo_acceso: this.data.ultimo_acceso
    };
  }

  // Crear instancia desde datos existentes
  public static fromData(userData: UserData): User {
    return new User(userData);
  }
}