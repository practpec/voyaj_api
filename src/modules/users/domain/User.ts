import { SecurityUtils } from '../../../shared/utils/SecurityUtils';
import { APP_LIMITS } from '../../../shared/constants/index';

export interface UserPreferences {
  language: 'es' | 'en' | 'fr' | 'pt';
  currency: 'USD' | 'EUR' | 'MXN' | 'GBP' | 'CAD';
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
    tripUpdates: boolean;
    friendRequests: boolean;
  };
  privacy: {
    profilePublic: boolean;
    showEmail: boolean;
    allowMessages: boolean;
    showOnlineStatus: boolean;
  };
  theme: 'light' | 'dark' | 'auto';
  timezone: string;
}

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

  // Nuevos campos de perfil extendido
  telefono?: string;
  pais?: string;
  ciudad?: string;
  fecha_nacimiento?: Date;
  biografia?: string;
  preferencias: UserPreferences;
  plan: 'free' | 'premium' | 'pro';
  esta_activo: boolean;
}

export class User {
  private data: UserData;

  constructor(userData: UserData) {
    this.data = { ...userData };
    this.validate();
  }

  // Getters existentes
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

  // Nuevos getters para campos extendidos
  public get phone(): string | undefined {
    return this.data.telefono;
  }

  public get country(): string | undefined {
    return this.data.pais;
  }

  public get city(): string | undefined {
    return this.data.ciudad;
  }

  public get birthDate(): Date | undefined {
    return this.data.fecha_nacimiento;
  }

  public get bio(): string | undefined {
    return this.data.biografia;
  }

  public get preferences(): UserPreferences {
    return this.data.preferencias;
  }

  public get plan(): 'free' | 'premium' | 'pro' {
    return this.data.plan;
  }

  public get isActive(): boolean {
    return this.data.esta_activo;
  }

  // Getters calculados
  public get fullName(): string {
    return this.data.nombre || this.data.correo_electronico.split('@')[0] || '';
  }

  public get firstName(): string {
    if (!this.data.nombre) return '';
    const parts = this.data.nombre.trim().split(' ');
    return parts[0] || '';
  }

  public get lastName(): string {
    if (!this.data.nombre) return '';
    const parts = this.data.nombre.trim().split(' ');
    return parts.slice(1).join(' ') || '';
  }

  public get age(): number | undefined {
    if (!this.data.fecha_nacimiento) return undefined;
    const today = new Date();
    const birth = new Date(this.data.fecha_nacimiento);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  // Métodos de negocio existentes
  public static async create(
    email: string,
    password: string,
    name?: string
  ): Promise<User> {
    const hashedPassword = await SecurityUtils.hashPassword(password);
    const userId = SecurityUtils.generateUUID();

    const defaultPreferences: UserPreferences = {
      language: 'es',
      currency: 'USD',
      notifications: {
        email: true,
        push: true,
        marketing: false,
        tripUpdates: true,
        friendRequests: true
      },
      privacy: {
        profilePublic: true,
        showEmail: false,
        allowMessages: true,
        showOnlineStatus: true
      },
      theme: 'auto',
      timezone: 'America/Mexico_City'
    };

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
      refresh_tokens: [],
      
      // Nuevos campos con valores por defecto
      telefono: undefined,
      pais: undefined,
      ciudad: undefined,
      fecha_nacimiento: undefined,
      biografia: undefined,
      preferencias: defaultPreferences,
      plan: 'free',
      esta_activo: true
    };

    return new User(userData);
  }

  // Métodos existentes (verifyPassword, changePassword, etc.)
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

  public updateProfile(name?: string, profilePictureUrl?: string): void {
    if (name !== undefined) {
      this.data.nombre = name.trim() || undefined;
    }

    if (profilePictureUrl !== undefined) {
      this.data.url_foto_perfil = profilePictureUrl || undefined;
    }

    this.data.modificado_en = new Date();
  }

  // Nuevos métodos para campos extendidos
  public updateExtendedProfile(updates: {
    phone?: string;
    country?: string;
    city?: string;
    birthDate?: Date;
    bio?: string;
  }): void {
    if (updates.phone !== undefined) {
      this.data.telefono = updates.phone?.trim() || undefined;
    }

    if (updates.country !== undefined) {
      this.data.pais = updates.country?.trim() || undefined;
    }

    if (updates.city !== undefined) {
      this.data.ciudad = updates.city?.trim() || undefined;
    }

    if (updates.birthDate !== undefined) {
      this.data.fecha_nacimiento = updates.birthDate;
    }

    if (updates.bio !== undefined) {
      this.data.biografia = updates.bio?.trim() || undefined;
    }

    this.data.modificado_en = new Date();
  }

  public updatePreferences(preferences: Partial<UserPreferences>): void {
    this.data.preferencias = {
      ...this.data.preferencias,
      ...preferences
    };

    // Validar preferencias anidadas
    if (preferences.notifications) {
      this.data.preferencias.notifications = {
        ...this.data.preferencias.notifications,
        ...preferences.notifications
      };
    }

    if (preferences.privacy) {
      this.data.preferencias.privacy = {
        ...this.data.preferencias.privacy,
        ...preferences.privacy
      };
    }

    this.data.modificado_en = new Date();
  }

  public updateAvatar(avatarUrl: string): void {
    this.data.url_foto_perfil = avatarUrl;
    this.data.modificado_en = new Date();
  }

  public updatePlan(plan: 'free' | 'premium' | 'pro'): void {
    this.data.plan = plan;
    this.data.modificado_en = new Date();
  }

  public deactivate(): void {
    this.data.esta_activo = false;
    this.data.modificado_en = new Date();
  }

  public activate(): void {
    this.data.esta_activo = true;
    this.data.modificado_en = new Date();
  }

  // Métodos existentes continuados
  public generateEmailVerificationCode(): string {
    const code = SecurityUtils.generateSecureCode(APP_LIMITS.EMAIL_VERIFICATION_CODE_LENGTH);
    const expiresAt = new Date(Date.now() + APP_LIMITS.EMAIL_VERIFICATION_EXPIRY);

    this.data.codigo_verificacion_email = code;
    this.data.codigo_verificacion_email_expira = expiresAt;
    this.data.modificado_en = new Date();

    return code;
  }

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

  public generatePasswordResetCode(): string {
    const code = SecurityUtils.generateSecureCode(APP_LIMITS.PASSWORD_RESET_CODE_LENGTH);
    const expiresAt = new Date(Date.now() + APP_LIMITS.PASSWORD_RESET_EXPIRY);

    this.data.codigo_recuperacion_password = code;
    this.data.codigo_recuperacion_password_expira = expiresAt;
    this.data.modificado_en = new Date();

    return code;
  }

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

  // Manejo de refresh tokens
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
    this.data.esta_activo = false;
    this.data.modificado_en = new Date();
    this.clearAllRefreshTokens();
  }

  public restore(): void {
    this.data.esta_eliminado = false;
    this.data.esta_activo = true;
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

    if (!this.data.preferencias) {
      throw new Error('Preferencias requeridas');
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
    telefono?: string;
    pais?: string;
    ciudad?: string;
    fecha_nacimiento?: Date;
    biografia?: string;
    preferencias: UserPreferences;
    plan: string;
    esta_activo: boolean;
    fullName: string;
    firstName: string;
    lastName: string;
    age?: number;
  } {
    return {
      id: this.data.id,
      correo_electronico: this.data.correo_electronico,
      nombre: this.data.nombre,
      url_foto_perfil: this.data.url_foto_perfil,
      email_verificado: this.data.email_verificado,
      creado_en: this.data.creado_en,
      ultimo_acceso: this.data.ultimo_acceso,
      telefono: this.data.telefono,
      pais: this.data.pais,
      ciudad: this.data.ciudad,
      fecha_nacimiento: this.data.fecha_nacimiento,
      biografia: this.data.biografia,
      preferencias: this.data.preferencias,
      plan: this.data.plan,
      esta_activo: this.data.esta_activo,
      fullName: this.fullName,
      firstName: this.firstName,
      lastName: this.lastName,
      age: this.age
    };
  }

  // Crear instancia desde datos existentes
  public static fromData(userData: UserData): User {
    return new User(userData);
  }
}