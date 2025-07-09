import { LoggerService } from './LoggerService';

export interface CacheItem<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheItem<any>>;
  private defaultTTL: number = 15 * 60 * 1000; // 15 minutos
  private maxSize: number = 1000;
  private logger: LoggerService;

  private constructor() {
    this.cache = new Map();
    this.logger = LoggerService.getInstance();
    this.startCleanupTimer();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Guardar en cache
  public set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs || this.defaultTTL;
    const now = Date.now();
    
    const item: CacheItem<T> = {
      data,
      expiresAt: now + ttl,
      createdAt: now
    };

    // Si excede el tamaño máximo, eliminar el más antiguo
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, item);
    this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}ms)`);
  }

  // Obtener del cache
  public get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.logger.debug(`Cache MISS: ${key}`);
      return null;
    }

    const now = Date.now();
    if (now > item.expiresAt) {
      this.cache.delete(key);
      this.logger.debug(`Cache EXPIRED: ${key}`);
      return null;
    }

    this.logger.debug(`Cache HIT: ${key}`);
    return item.data as T;
  }

  // Verificar si existe en cache
  public has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const now = Date.now();
    if (now > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Eliminar del cache
  public delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache DELETE: ${key}`);
    }
    return deleted;
  }

  // Limpiar todo el cache
  public clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.info(`Cache limpiado: ${size} elementos eliminados`);
  }

  // Obtener o establecer (get or set)
  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttlMs?: number
  ): Promise<T> {
    let data = this.get<T>(key);
    
    if (data === null) {
      this.logger.debug(`Cache MISS: ${key} - Ejecutando factory`);
      data = await factory();
      this.set(key, data, ttlMs);
    }
    
    return data;
  }

  // Cache específico para usuarios
  public setUser(userId: string, userData: any, ttlMs?: number): void {
    this.set(`user:${userId}`, userData, ttlMs);
  }

  public getUser(userId: string): any | null {
    return this.get(`user:${userId}`);
  }

  public deleteUser(userId: string): boolean {
    return this.delete(`user:${userId}`);
  }

  // Cache específico para sesiones
  public setSession(sessionId: string, sessionData: any, ttlMs?: number): void {
    this.set(`session:${sessionId}`, sessionData, ttlMs);
  }

  public getSession(sessionId: string): any | null {
    return this.get(`session:${sessionId}`);
  }

  public deleteSession(sessionId: string): boolean {
    return this.delete(`session:${sessionId}`);
  }

  // Cache específico para rate limiting
  public incrementRateLimit(key: string, windowMs: number): number {
    const rateLimitKey = `rate:${key}`;
    const current = this.get<number>(rateLimitKey) || 0;
    const newCount = current + 1;
    
    this.set(rateLimitKey, newCount, windowMs);
    return newCount;
  }

  public getRateLimit(key: string): number {
    return this.get<number>(`rate:${key}`) || 0;
  }

  // Cache específico para códigos de verificación
  public setVerificationCode(
    email: string,
    code: string,
    type: 'email' | 'password',
    ttlMs: number
  ): void {
    const key = `verification:${type}:${email}`;
    this.set(key, { code, email, type }, ttlMs);
  }

  public getVerificationCode(
    email: string,
    type: 'email' | 'password'
  ): { code: string; email: string; type: string } | null {
    const key = `verification:${type}:${email}`;
    return this.get(key);
  }

  public deleteVerificationCode(email: string, type: 'email' | 'password'): boolean {
    const key = `verification:${type}:${email}`;
    return this.delete(key);
  }

  // Cache para resultados de búsqueda
  public setSearchResults(query: string, results: any[], ttlMs?: number): void {
    const searchKey = `search:${this.hashString(query)}`;
    this.set(searchKey, results, ttlMs || 5 * 60 * 1000); // 5 minutos por defecto
  }

  public getSearchResults(query: string): any[] | null {
    const searchKey = `search:${this.hashString(query)}`;
    return this.get(searchKey);
  }

  // Cache para consultas de base de datos
  public setQueryResult(queryHash: string, result: any, ttlMs?: number): void {
    const key = `query:${queryHash}`;
    this.set(key, result, ttlMs || 10 * 60 * 1000); // 10 minutos por defecto
  }

  public getQueryResult(queryHash: string): any | null {
    const key = `query:${queryHash}`;
    return this.get(key);
  }

  // Invalidar cache por patrón
  public invalidatePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    this.logger.info(`Cache invalidado por patrón "${pattern}": ${deleted} elementos`);
    return deleted;
  }

  // Invalidar cache de usuario específico
  public invalidateUser(userId: string): number {
    return this.invalidatePattern(`user:${userId}`);
  }

  // Eliminar elemento más antiguo
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.createdAt < oldestTime) {
        oldestTime = item.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug(`Cache evicted oldest: ${oldestKey}`);
    }
  }

  // Timer para limpieza automática
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Limpieza cada 5 minutos
  }

  // Limpiar elementos expirados
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cache cleanup: ${cleaned} elementos expirados eliminados`);
    }
  }

  // Hash simple para strings
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit
    }
    return Math.abs(hash).toString(16);
  }

  // Obtener estadísticas del cache
  public getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: string;
  } {
    const memoryUsage = process.memoryUsage();
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Implementar contador de hits/misses si es necesario
      memoryUsage: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
    };
  }

  // Configurar TTL por defecto
  public setDefaultTTL(ttlMs: number): void {
    this.defaultTTL = ttlMs;
    this.logger.info(`Cache TTL por defecto cambiado a: ${ttlMs}ms`);
  }

  // Configurar tamaño máximo
  public setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;
    this.logger.info(`Cache tamaño máximo cambiado a: ${maxSize}`);
  }
}