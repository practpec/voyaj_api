import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { APP_LIMITS } from '../constants/index';

export class SecurityUtils {
  private static readonly SALT_ROUNDS = 12;
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  // Hash de contraseñas
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  // Verificación de contraseñas
  public static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Generación de códigos seguros
  public static generateSecureCode(length: number = APP_LIMITS.EMAIL_VERIFICATION_CODE_LENGTH): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  // Generación de tokens aleatorios
  public static generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generación de UUID v4
  public static generateUUID(): string {
    return crypto.randomUUID();
  }

  // Encriptación de datos sensibles
  public static encryptData(data: string, secretKey: string): {
    encrypted: string;
    iv: string;
    tag: string;
  } {
    const key = crypto.scryptSync(secretKey, 'salt', this.KEY_LENGTH);
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  // Desencriptación de datos
  public static decryptData(
    encryptedData: string,
    iv: string,
    tag: string,
    secretKey: string
  ): string {
    const key = crypto.scryptSync(secretKey, 'salt', this.KEY_LENGTH);
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Sanitización de inputs para prevenir XSS
  public static sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  // Validación de fortaleza de contraseña avanzada
  public static checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isSecure: boolean;
  } {
    let score = 0;
    const feedback: string[] = [];

    // Longitud
    if (password.length >= 8) score += 1;
    else feedback.push('Usa al menos 8 caracteres');

    if (password.length >= 12) score += 1;
    else if (password.length >= 8) feedback.push('Para mayor seguridad, usa 12 o más caracteres');

    // Complejidad de caracteres
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Incluye letras minúsculas');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Incluye letras mayúsculas');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Incluye números');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    else feedback.push('Incluye símbolos especiales');

    // Penalizaciones por patrones comunes
    if (/(.)\1{2,}/.test(password)) {
      score -= 1;
      feedback.push('Evita repetir el mismo caracter');
    }

    if (/123|abc|qwe/i.test(password)) {
      score -= 1;
      feedback.push('Evita secuencias comunes');
    }

    const isSecure = score >= 4;
    return { score: Math.max(0, score), feedback, isSecure };
  }

  // Detección de patrones sospechosos en requests
  public static detectSuspiciousPatterns(input: string): {
    isSuspicious: boolean;
    patterns: string[];
  } {
    const suspiciousPatterns = [
      { pattern: /<script/i, name: 'Script injection' },
      { pattern: /javascript:/i, name: 'JavaScript protocol' },
      { pattern: /on\w+=/i, name: 'Event handler' },
      { pattern: /union\s+select/i, name: 'SQL injection' },
      { pattern: /drop\s+table/i, name: 'SQL drop' },
      { pattern: /insert\s+into/i, name: 'SQL insert' },
      { pattern: /delete\s+from/i, name: 'SQL delete' },
      { pattern: /\.\.\//g, name: 'Path traversal' },
      { pattern: /etc\/passwd/i, name: 'System file access' }
    ];

    const detectedPatterns: string[] = [];

    for (const { pattern, name } of suspiciousPatterns) {
      if (pattern.test(input)) {
        detectedPatterns.push(name);
      }
    }

    return {
      isSuspicious: detectedPatterns.length > 0,
      patterns: detectedPatterns
    };
  }

  // Rate limiting helpers
  public static generateRateLimitKey(ip: string, endpoint: string): string {
    return `rate_limit:${ip}:${endpoint}`;
  }

  // Generación de headers de seguridad
  public static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'",
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
  }

  // Ofuscación de email para logs
  public static obfuscateEmail(email: string): string {
    const emailParts = email.split('@');
    if (emailParts.length !== 2) return email;
    
    const [localPart, domain] = emailParts;
    if (!localPart || !domain) return email;
    
    const obfuscatedLocal = localPart.length > 2 
      ? `${localPart.substring(0, 2)}${'*'.repeat(localPart.length - 2)}`
      : `${localPart[0]}*`;
    
    return `${obfuscatedLocal}@${domain}`;
  }

  // Verificación de IP confiable
  public static isTrustedIP(ip: string, trustedIPs: string[] = []): boolean {
    const defaultTrusted = ['127.0.0.1', '::1', 'localhost'];
    const allTrusted = [...defaultTrusted, ...trustedIPs];
    return allTrusted.includes(ip);
  }

  // Generación de checksum para integridad de datos
  public static generateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Verificación de checksum
  public static verifyChecksum(data: string, expectedChecksum: string): boolean {
    const actualChecksum = this.generateChecksum(data);
    return crypto.timingSafeEqual(
      Buffer.from(actualChecksum, 'hex'),
      Buffer.from(expectedChecksum, 'hex')
    );
  }

  // Escape de caracteres para regex
  public static escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Validación de origen de request
  public static validateOrigin(origin: string, allowedOrigins: string[]): boolean {
    if (!origin) return false;
    return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
  }

  // Generación de hash SHA-256
  public static generateSHA256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Generación de hash MD5 (solo para casos no críticos)
  public static generateMD5(data: string): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  // Validación de formato de email básico
  public static isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Generación de salt para bcrypt
  public static generateSalt(rounds: number = this.SALT_ROUNDS): string {
    return bcrypt.genSaltSync(rounds);
  }

  // Comparación segura de strings (timing-safe)
  public static secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    return crypto.timingSafeEqual(
      Buffer.from(a, 'utf8'),
      Buffer.from(b, 'utf8')
    );
  }

  // Generación de token CSRF
  public static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  // Validación de token CSRF
  public static validateCSRFToken(token: string, expected: string): boolean {
    return this.secureCompare(token, expected);
  }
}