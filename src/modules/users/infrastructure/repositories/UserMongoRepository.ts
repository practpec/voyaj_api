import { Collection, MongoClient } from 'mongodb';
import { User, UserData } from '../../domain/User';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { DatabaseConnection } from '../../../../shared/database/Connection';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { PaginatedResult, PaginationOptions, PaginationUtils } from '../../../../shared/utils/PaginationUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';

export class UserMongoRepository implements IUserRepository {
  private collection: Collection<UserData>;
  private logger: LoggerService;

  constructor() {
    const db = DatabaseConnection.getInstance().getDatabase();
    this.collection = db.collection<UserData>('usuarios');
    this.logger = LoggerService.getInstance();
    
    // Crear índices
    this.createIndexes();
  }

  private async createIndexes(): Promise<void> {
    try {
      await Promise.all([
        // Índices existentes
        this.collection.createIndex(
          { correo_electronico: 1 },
          { unique: true, background: true }
        ),
        this.collection.createIndex(
          { nombre: 'text', correo_electronico: 'text' },
          { background: true }
        ),
        this.collection.createIndex(
          { esta_eliminado: 1 },
          { background: true }
        ),
        this.collection.createIndex(
          { bloqueado_hasta: 1 },
          { background: true, sparse: true }
        ),
        this.collection.createIndex(
          { refresh_tokens: 1 },
          { background: true, sparse: true }
        ),
        this.collection.createIndex(
          { 
            correo_electronico: 1, 
            codigo_verificacion_email: 1,
            codigo_verificacion_email_expira: 1
          },
          { background: true, sparse: true }
        ),
        this.collection.createIndex(
          { 
            correo_electronico: 1,
            codigo_recuperacion_password: 1,
            codigo_recuperacion_password_expira: 1
          },
          { background: true, sparse: true }
        ),
        this.collection.createIndex(
          { creado_en: -1 },
          { background: true }
        ),

        // NUEVOS ÍNDICES para campos extendidos
        // Índice para búsquedas por país
        this.collection.createIndex(
          { pais: 1 },
          { background: true, sparse: true }
        ),
        
        // Índice para búsquedas por ciudad
        this.collection.createIndex(
          { ciudad: 1 },
          { background: true, sparse: true }
        ),
        
        // Índice compuesto para búsquedas por ubicación
        this.collection.createIndex(
          { pais: 1, ciudad: 1 },
          { background: true, sparse: true }
        ),
        
        // Índice para fecha de nacimiento (útil para estadísticas por edad)
        this.collection.createIndex(
          { fecha_nacimiento: 1 },
          { background: true, sparse: true }
        ),
        
        // Índice para plan de usuario
        this.collection.createIndex(
          { plan: 1 },
          { background: true }
        ),
        
        // Índice para usuarios activos
        this.collection.createIndex(
          { esta_activo: 1 },
          { background: true }
        ),
        
        // Índice compuesto para usuarios activos no eliminados
        this.collection.createIndex(
          { esta_activo: 1, esta_eliminado: 1 },
          { background: true }
        ),
        
        // Índice para teléfono (si se implementa verificación por SMS)
        this.collection.createIndex(
          { telefono: 1 },
          { background: true, sparse: true }
        ),
        
        // Índice para búsquedas de texto extendidas
        this.collection.createIndex(
          { 
            nombre: 'text', 
            correo_electronico: 'text',
            biografia: 'text',
            pais: 'text',
            ciudad: 'text'
          },
          { 
            background: true,
            weights: {
              nombre: 10,
              correo_electronico: 5,
              biografia: 1,
              pais: 2,
              ciudad: 2
            }
          }
        ),
        
        // Índice para preferencias de idioma (útil para estadísticas)
        this.collection.createIndex(
          { 'preferencias.language': 1 },
          { background: true, sparse: true }
        ),
        
        // Índice para preferencias de moneda
        this.collection.createIndex(
          { 'preferencias.currency': 1 },
          { background: true, sparse: true }
        )
      ]);
      
      this.logger.info('Índices de usuarios (extendidos) creados exitosamente');
    } catch (error) {
      this.logger.error('Error creando índices extendidos de usuarios:', error);
    }
  }

  // Operaciones básicas CRUD
  public async create(user: User): Promise<void> {
    try {
      const userData = user.toData();
      await this.collection.insertOne(userData);
      
      this.logger.logDatabase('INSERT', 'usuarios', undefined, undefined);
    } catch (error) {
      this.logger.logDatabase('INSERT', 'usuarios', undefined, error);
      throw ErrorHandler.createDatabaseError('Error creando usuario', error);
    }
  }

  public async findById(id: string): Promise<User | null> {
    try {
      const startTime = Date.now();
      const userData = await this.collection.findOne({ id });
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_BY_ID', 'usuarios', duration);
      
      return userData ? User.fromData(userData) : null;
    } catch (error) {
      this.logger.logDatabase('FIND_BY_ID', 'usuarios', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando usuario por ID', error);
    }
  }

  public async findByEmail(email: string): Promise<User | null> {
    try {
      const startTime = Date.now();
      const userData = await this.collection.findOne({ 
        correo_electronico: email.toLowerCase() 
      });
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_BY_EMAIL', 'usuarios', duration);
      
      return userData ? User.fromData(userData) : null;
    } catch (error) {
      this.logger.logDatabase('FIND_BY_EMAIL', 'usuarios', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando usuario por email', error);
    }
  }

  public async update(user: User): Promise<void> {
    try {
      const userData = user.toData();
      userData.modificado_en = new Date();
      
      const result = await this.collection.updateOne(
        { id: user.id },
        { $set: userData }
      );

      if (result.matchedCount === 0) {
        throw ErrorHandler.createUserNotFoundError();
      }
      
      this.logger.logDatabase('UPDATE', 'usuarios');
    } catch (error) {
      this.logger.logDatabase('UPDATE', 'usuarios', undefined, error);
      throw ErrorHandler.createDatabaseError('Error actualizando usuario', error);
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const result = await this.collection.updateOne(
        { id },
        { 
          $set: { 
            esta_eliminado: true,
            modificado_en: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        throw ErrorHandler.createUserNotFoundError();
      }
      
      this.logger.logDatabase('SOFT_DELETE', 'usuarios');
    } catch (error) {
      this.logger.logDatabase('SOFT_DELETE', 'usuarios', undefined, error);
      throw ErrorHandler.createDatabaseError('Error eliminando usuario', error);
    }
  }

  // Operaciones de búsqueda
  public async findMany(options: PaginationOptions): Promise<PaginatedResult<User>> {
    try {
      const startTime = Date.now();
      const skip = PaginationUtils.calculateSkip(options.page, options.limit);
      const sortQuery = PaginationUtils.createSortQuery(options.sortBy || 'creado_en', options.sortOrder || 'desc');

      const [users, totalCount] = await Promise.all([
        this.collection
          .find({ esta_eliminado: { $ne: true } })
          .sort(sortQuery)
          .skip(skip)
          .limit(options.limit)
          .toArray(),
        this.collection.countDocuments({ esta_eliminado: { $ne: true } })
      ]);

      const duration = Date.now() - startTime;
      this.logger.logDatabase('FIND_MANY', 'usuarios', duration);

      const userInstances = users.map(userData => User.fromData(userData));
      return PaginationUtils.createPaginatedResult(
        userInstances,
        options.page,
        options.limit,
        totalCount
      );
    } catch (error) {
      this.logger.logDatabase('FIND_MANY', 'usuarios', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando usuarios', error);
    }
  }

  public async searchByEmailOrName(
    query: string,
    options: PaginationOptions
  ): Promise<PaginatedResult<User>> {
    try {
      const startTime = Date.now();
      const skip = PaginationUtils.calculateSkip(options.page, options.limit);
      const sortQuery = PaginationUtils.createSortQuery(options.sortBy || 'creado_en', options.sortOrder || 'desc');

      // Crear filtro de búsqueda
      const searchFilter = {
        esta_eliminado: { $ne: true },
        $or: [
          { correo_electronico: { $regex: query, $options: 'i' } },
          { nombre: { $regex: query, $options: 'i' } }
        ]
      };

      const [users, totalCount] = await Promise.all([
        this.collection
          .find(searchFilter)
          .sort(sortQuery)
          .skip(skip)
          .limit(options.limit)
          .toArray(),
        this.collection.countDocuments(searchFilter)
      ]);

      const duration = Date.now() - startTime;
      this.logger.logDatabase('SEARCH', 'usuarios', duration);

      const userInstances = users.map(userData => User.fromData(userData));
      return PaginationUtils.createPaginatedResult(
        userInstances,
        options.page,
        options.limit,
        totalCount
      );
    } catch (error) {
      this.logger.logDatabase('SEARCH', 'usuarios', undefined, error);
      throw ErrorHandler.createDatabaseError('Error en búsqueda de usuarios', error);
    }
  }

  // Operaciones específicas de autenticación
  public async findByEmailForAuth(email: string): Promise<User | null> {
    try {
      const startTime = Date.now();
      const userData = await this.collection.findOne({ 
        correo_electronico: email.toLowerCase()
      });
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_FOR_AUTH', 'usuarios', duration);
      
      return userData ? User.fromData(userData) : null;
    } catch (error) {
      this.logger.logDatabase('FIND_FOR_AUTH', 'usuarios', undefined, error);
      throw ErrorHandler.createDatabaseError('Error en autenticación', error);
    }
  }

  public async findByRefreshToken(token: string): Promise<User | null> {
    try {
      const startTime = Date.now();
      const userData = await this.collection.findOne({ 
        refresh_tokens: token,
        esta_eliminado: { $ne: true }
      });
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_BY_REFRESH_TOKEN', 'usuarios', duration);
      
      return userData ? User.fromData(userData) : null;
    } catch (error) {
      this.logger.logDatabase('FIND_BY_REFRESH_TOKEN', 'usuarios', undefined, error);
      throw ErrorHandler.createDatabaseError('Error validando refresh token', error);
    }
  }

  // Operaciones de verificación
  public async findByVerificationCode(
    email: string,
    code: string,
    type: 'email' | 'password'
  ): Promise<User | null> {
    try {
      const startTime = Date.now();
      const now = new Date();
      
      let filter: any = {
        correo_electronico: email.toLowerCase(),
        esta_eliminado: { $ne: true }
      };

      if (type === 'email') {
        filter.codigo_verificacion_email = code;
        filter.codigo_verificacion_email_expira = { $gt: now };
      } else {
        filter.codigo_recuperacion_password = code;
        filter.codigo_recuperacion_password_expira = { $gt: now };
      }

      const userData = await this.collection.findOne(filter);
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_BY_VERIFICATION_CODE', 'usuarios', duration);
      
      return userData ? User.fromData(userData) : null;
    } catch (error) {
      this.logger.logDatabase('FIND_BY_VERIFICATION_CODE', 'usuarios', undefined, error);
      throw ErrorHandler.createDatabaseError('Error validando código de verificación', error);
    }
  }

  // Operaciones de administración
  public async findDeletedUsers(options: PaginationOptions): Promise<PaginatedResult<User>> {
    try {
      const startTime = Date.now();
      const skip = PaginationUtils.calculateSkip(options.page, options.limit);
      const sortQuery = PaginationUtils.createSortQuery(options.sortBy || 'modificado_en', options.sortOrder || 'desc');

      const [users, totalCount] = await Promise.all([
        this.collection
          .find({ esta_eliminado: true })
          .sort(sortQuery)
          .skip(skip)
          .limit(options.limit)
          .toArray(),
        this.collection.countDocuments({ esta_eliminado: true })
      ]);

      const duration = Date.now() - startTime;
      this.logger.logDatabase('FIND_DELETED', 'usuarios', duration);

      const userInstances = users.map(userData => User.fromData(userData));
      return PaginationUtils.createPaginatedResult(
        userInstances,
        options.page,
        options.limit,
        totalCount
      );
    } catch (error) {
      this.logger.logDatabase('FIND_DELETED', 'usuarios', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando usuarios eliminados', error);
    }
  }

  public async findBlockedUsers(options: PaginationOptions): Promise<PaginatedResult<User>> {
    try {
      const startTime = Date.now();
      const skip = PaginationUtils.calculateSkip(options.page, options.limit);
      const sortQuery = PaginationUtils.createSortQuery(options.sortBy || 'bloqueado_hasta', options.sortOrder || 'desc');
      const now = new Date();

      const [users, totalCount] = await Promise.all([
        this.collection
          .find({ 
            bloqueado_hasta: { $gt: now },
            esta_eliminado: { $ne: true }
          })
          .sort(sortQuery)
          .skip(skip)
          .limit(options.limit)
          .toArray(),
        this.collection.countDocuments({ 
          bloqueado_hasta: { $gt: now },
          esta_eliminado: { $ne: true }
        })
      ]);

      const duration = Date.now() - startTime;
      this.logger.logDatabase('FIND_BLOCKED', 'usuarios', duration);

      const userInstances = users.map(userData => User.fromData(userData));
      return PaginationUtils.createPaginatedResult(
        userInstances,
        options.page,
        options.limit,
        totalCount
      );
    } catch (error) {
      this.logger.logDatabase('FIND_BLOCKED', 'usuarios', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando usuarios bloqueados', error);
    }
  }

  // Estadísticas
  public async countTotal(): Promise<number> {
    try {
      return await this.collection.countDocuments({});
    } catch (error) {
      throw ErrorHandler.createDatabaseError('Error contando usuarios totales', error);
    }
  }

  public async countActive(): Promise<number> {
    try {
      return await this.collection.countDocuments({ esta_eliminado: { $ne: true } });
    } catch (error) {
      throw ErrorHandler.createDatabaseError('Error contando usuarios activos', error);
    }
  }

  public async countDeleted(): Promise<number> {
    try {
      return await this.collection.countDocuments({ esta_eliminado: true });
    } catch (error) {
      throw ErrorHandler.createDatabaseError('Error contando usuarios eliminados', error);
    }
  }

  public async countVerified(): Promise<number> {
    try {
      return await this.collection.countDocuments({ 
        email_verificado: true,
        esta_eliminado: { $ne: true }
      });
    } catch (error) {
      throw ErrorHandler.createDatabaseError('Error contando usuarios verificados', error);
    }
  }

  public async countBlocked(): Promise<number> {
    try {
      const now = new Date();
      return await this.collection.countDocuments({ 
        bloqueado_hasta: { $gt: now },
        esta_eliminado: { $ne: true }
      });
    } catch (error) {
      throw ErrorHandler.createDatabaseError('Error contando usuarios bloqueados', error);
    }
  }

  // Operaciones de limpieza
  public async cleanExpiredVerificationCodes(): Promise<number> {
    try {
      const now = new Date();
      const result = await this.collection.updateMany(
        { 
          codigo_verificacion_email_expira: { $lt: now }
        },
        { 
          $unset: { 
            codigo_verificacion_email: "",
            codigo_verificacion_email_expira: ""
          },
          $set: { modificado_en: now }
        }
      );

      this.logger.logDatabase('CLEAN_EXPIRED_EMAIL_CODES', 'usuarios');
      return result.modifiedCount;
    } catch (error) {
      this.logger.logDatabase('CLEAN_EXPIRED_EMAIL_CODES', 'usuarios', undefined, error);
      throw ErrorHandler.createDatabaseError('Error limpiando códigos de email expirados', error);
    }
  }

  public async cleanExpiredPasswordResetCodes(): Promise<number> {
    try {
      const now = new Date();
      const result = await this.collection.updateMany(
        { 
          codigo_recuperacion_password_expira: { $lt: now }
        },
        { 
          $unset: { 
            codigo_recuperacion_password: "",
            codigo_recuperacion_password_expira: ""
          },
          $set: { modificado_en: now }
        }
      );

      this.logger.logDatabase('CLEAN_EXPIRED_PASSWORD_CODES', 'usuarios');
      return result.modifiedCount;
    } catch (error) {
      this.logger.logDatabase('CLEAN_EXPIRED_PASSWORD_CODES', 'usuarios', undefined, error);
      throw ErrorHandler.createDatabaseError('Error limpiando códigos de password expirados', error);
    }
  }

  public async cleanOldDeletedUsers(daysOld: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.collection.deleteMany({
        esta_eliminado: true,
        modificado_en: { $lt: cutoffDate }
      });

      this.logger.logDatabase('CLEAN_OLD_DELETED', 'usuarios');
      return result.deletedCount || 0;
    } catch (error) {
      this.logger.logDatabase('CLEAN_OLD_DELETED', 'usuarios', undefined, error);
      throw ErrorHandler.createDatabaseError('Error limpiando usuarios eliminados antiguos', error);
    }
  }
}