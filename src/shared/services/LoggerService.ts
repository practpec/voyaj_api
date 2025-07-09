import fs from 'fs';
import path from 'path';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
  requestId?: string;
  userId?: string;
}

export class LoggerService {
  private static instance: LoggerService;
  private logsDir: string;
  private maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private maxFiles: number = 5;

  private constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.ensureLogsDirectory();
  }

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const baseLog = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
      return `${baseLog}\nData: ${dataStr}`;
    }
    
    return baseLog;
  }

  private writeToFile(level: LogLevel, content: string): void {
    const filename = `${level}.log`;
    const filepath = path.join(this.logsDir, filename);
    
    try {
      // Verificar tamaño del archivo y rotar si es necesario
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        if (stats.size > this.maxFileSize) {
          this.rotateLogFile(level);
        }
      }
      
      fs.appendFileSync(filepath, content + '\n', 'utf8');
    } catch (error) {
      console.error('Error escribiendo al archivo de log:', error);
    }
  }

  private rotateLogFile(level: LogLevel): void {
    const baseFilename = `${level}.log`;
    const basePath = path.join(this.logsDir, baseFilename);
    
    try {
      // Mover archivos existentes
      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldFile = path.join(this.logsDir, `${level}.${i}.log`);
        const newFile = path.join(this.logsDir, `${level}.${i + 1}.log`);
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldFile); // Eliminar el más antiguo
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
      
      // Mover el archivo actual
      if (fs.existsSync(basePath)) {
        const rotatedFile = path.join(this.logsDir, `${level}.1.log`);
        fs.renameSync(basePath, rotatedFile);
      }
    } catch (error) {
      console.error('Error rotando archivo de log:', error);
    }
  }

  private log(level: LogLevel, message: string, data?: any): void {
    const formattedMessage = this.formatMessage(level, message, data);
    
    // Escribir al archivo
    this.writeToFile(level, formattedMessage);
    
    // También escribir a la consola en desarrollo
    if (process.env.NODE_ENV === 'development') {
      switch (level) {
        case 'error':
          console.error(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'info':
          console.info(formattedMessage);
          break;
        case 'debug':
          console.debug(formattedMessage);
          break;
      }
    }
  }

  // Métodos públicos para logging
  public error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  public warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  public info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  public debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  // Logging específico para autenticación
  public logAuth(action: string, userId?: string, email?: string, success: boolean = true): void {
    const message = `Auth: ${action} - ${success ? 'SUCCESS' : 'FAILED'}`;
    const data = { userId, email, action, success };
    
    if (success) {
      this.info(message, data);
    } else {
      this.warn(message, data);
    }
  }

  // Logging específico para operaciones de base de datos
  public logDatabase(operation: string, collection: string, duration?: number, error?: any): void {
    const message = `DB: ${operation} on ${collection}`;
    const data = { operation, collection, duration, error };
    
    if (error) {
      this.error(message + ' - FAILED', data);
    } else {
      this.debug(message + ' - SUCCESS', data);
    }
  }

  // Logging específico para requests HTTP
  public logRequest(method: string, url: string, statusCode: number, duration: number, userId?: string): void {
    const message = `HTTP: ${method} ${url} - ${statusCode}`;
    const data = { method, url, statusCode, duration, userId };
    
    if (statusCode >= 400) {
      this.warn(message, data);
    } else {
      this.info(message, data);
    }
  }

  // Logging específico para eventos de seguridad
  public logSecurity(event: string, ip: string, userAgent?: string, userId?: string): void {
    const message = `Security: ${event}`;
    const data = { event, ip, userAgent, userId };
    this.warn(message, data);
  }

  // Logging específico para emails
  public logEmail(action: string, recipient: string, success: boolean = true, error?: any): void {
    const message = `Email: ${action} to ${recipient}`;
    const data = { action, recipient, success, error };
    
    if (success) {
      this.info(message + ' - SENT', data);
    } else {
      this.error(message + ' - FAILED', data);
    }
  }

  // Obtener logs por nivel
  public getLogs(level: LogLevel, lines: number = 100): string[] {
    const filepath = path.join(this.logsDir, `${level}.log`);
    
    try {
      if (!fs.existsSync(filepath)) {
        return [];
      }
      
      const content = fs.readFileSync(filepath, 'utf8');
      const allLines = content.split('\n').filter(line => line.trim());
      
      return allLines.slice(-lines);
    } catch (error) {
      console.error('Error leyendo archivo de log:', error);
      return [];
    }
  }

  // Limpiar logs antiguos
  public cleanOldLogs(daysOld: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    try {
      const files = fs.readdirSync(this.logsDir);
      
      for (const file of files) {
        const filepath = path.join(this.logsDir, file);
        const stats = fs.statSync(filepath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filepath);
          this.info(`Archivo de log eliminado: ${file}`);
        }
      }
    } catch (error) {
      this.error('Error limpiando logs antiguos:', error);
    }
  }

  // Obtener estadísticas de logs
  public getLogStats(): {
    totalFiles: number;
    totalSize: number;
    oldestLog: Date | null;
    newestLog: Date | null;
  } {
    try {
      const files = fs.readdirSync(this.logsDir);
      let totalSize = 0;
      let oldestLog: Date | null = null;
      let newestLog: Date | null = null;
      
      for (const file of files) {
        const filepath = path.join(this.logsDir, file);
        const stats = fs.statSync(filepath);
        
        totalSize += stats.size;
        
        if (!oldestLog || stats.mtime < oldestLog) {
          oldestLog = stats.mtime;
        }
        
        if (!newestLog || stats.mtime > newestLog) {
          newestLog = stats.mtime;
        }
      }
      
      return {
        totalFiles: files.length,
        totalSize,
        oldestLog,
        newestLog
      };
    } catch (error) {
      this.error('Error obteniendo estadísticas de logs:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestLog: null,
        newestLog: null
      };
    }
  }
}