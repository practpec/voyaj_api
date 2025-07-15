// src/modules/subscriptions/infrastructure/repositories/SubscriptionMongoRepository.ts
import { Collection } from 'mongodb';
import { Subscription, SubscriptionData } from '../../domain/Subscription';
import { ISubscriptionRepository } from '../../domain/interfaces/ISubscriptionRepository';
import { DatabaseConnection } from '../../../../shared/database/Connection';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';

export class SubscriptionMongoRepository implements ISubscriptionRepository {
  private collection: Collection<SubscriptionData>;
  private logger: LoggerService;

  constructor() {
    const db = DatabaseConnection.getInstance().getDatabase();
    this.collection = db.collection<SubscriptionData>('subscriptions');
    this.logger = LoggerService.getInstance();
    
    this.createIndexes();
  }

  private async createIndexes(): Promise<void> {
    try {
      await Promise.all([
        // Índice único por usuario (solo puede tener una suscripción activa)
        this.collection.createIndex(
          { userId: 1, status: 1 },
          { background: true }
        ),
        
        // Índice para Stripe IDs
        this.collection.createIndex(
          { stripeSubscriptionId: 1 },
          { background: true, sparse: true }
        ),
        
        this.collection.createIndex(
          { stripeCustomerId: 1 },
          { background: true, sparse: true }
        ),

        // Índice para vencimientos
        this.collection.createIndex(
          { currentPeriodEnd: 1 },
          { background: true }
        ),

        // Índice para status
        this.collection.createIndex(
          { status: 1 },
          { background: true }
        ),

        // Índice para plan
        this.collection.createIndex(
          { plan: 1 },
          { background: true }
        )
      ]);
      
      this.logger.info('Índices de suscripciones creados exitosamente');
    } catch (error) {
      this.logger.error('Error creando índices de suscripciones:', error);
    }
  }

  // Operaciones básicas CRUD
  public async create(subscription: Subscription): Promise<void> {
    try {
      const subscriptionData = subscription.toData();
      await this.collection.insertOne(subscriptionData);
      
      this.logger.logDatabase('INSERT', 'subscriptions');
    } catch (error) {
      this.logger.logDatabase('INSERT', 'subscriptions', undefined, error);
      throw ErrorHandler.createDatabaseError('Error creando suscripción', error);
    }
  }

  public async findById(id: string): Promise<Subscription | null> {
    try {
      const startTime = Date.now();
      const subscriptionData = await this.collection.findOne({ id });
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_BY_ID', 'subscriptions', duration);
      
      return subscriptionData ? Subscription.fromData(subscriptionData) : null;
    } catch (error) {
      this.logger.logDatabase('FIND_BY_ID', 'subscriptions', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando suscripción por ID', error);
    }
  }

  public async update(subscription: Subscription): Promise<void> {
    try {
      const subscriptionData = subscription.toData();
      subscriptionData.updatedAt = new Date();
      
      const result = await this.collection.updateOne(
        { id: subscription.id },
        { $set: subscriptionData }
      );

      if (result.matchedCount === 0) {
        throw new Error('Suscripción no encontrada');
      }
      
      this.logger.logDatabase('UPDATE', 'subscriptions');
    } catch (error) {
      this.logger.logDatabase('UPDATE', 'subscriptions', undefined, error);
      throw ErrorHandler.createDatabaseError('Error actualizando suscripción', error);
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const result = await this.collection.deleteOne({ id });

      if (result.deletedCount === 0) {
        throw new Error('Suscripción no encontrada');
      }
      
      this.logger.logDatabase('DELETE', 'subscriptions');
    } catch (error) {
      this.logger.logDatabase('DELETE', 'subscriptions', undefined, error);
      throw ErrorHandler.createDatabaseError('Error eliminando suscripción', error);
    }
  }

  // Operaciones específicas de suscripciones
  public async findActiveByUserId(userId: string): Promise<Subscription | null> {
    try {
      const startTime = Date.now();
      const subscriptionData = await this.collection.findOne({
        userId,
        status: { $in: ['ACTIVE', 'TRIALING'] }
      });
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_ACTIVE_BY_USER', 'subscriptions', duration);
      
      return subscriptionData ? Subscription.fromData(subscriptionData) : null;
    } catch (error) {
      this.logger.logDatabase('FIND_ACTIVE_BY_USER', 'subscriptions', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando suscripción activa', error);
    }
  }

  public async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null> {
    try {
      const startTime = Date.now();
      const subscriptionData = await this.collection.findOne({ stripeSubscriptionId });
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_BY_STRIPE_ID', 'subscriptions', duration);
      
      return subscriptionData ? Subscription.fromData(subscriptionData) : null;
    } catch (error) {
      this.logger.logDatabase('FIND_BY_STRIPE_ID', 'subscriptions', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando por Stripe ID', error);
    }
  }

  public async findByStripeCustomerId(stripeCustomerId: string): Promise<Subscription[]> {
    try {
      const startTime = Date.now();
      const subscriptionsData = await this.collection.find({ stripeCustomerId }).toArray();
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_BY_CUSTOMER_ID', 'subscriptions', duration);
      
      return subscriptionsData.map(data => Subscription.fromData(data));
    } catch (error) {
      this.logger.logDatabase('FIND_BY_CUSTOMER_ID', 'subscriptions', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando por Customer ID', error);
    }
  }

  // Consultas de estado
  public async findExpiredSubscriptions(): Promise<Subscription[]> {
    try {
      const now = new Date();
      const subscriptionsData = await this.collection.find({
        currentPeriodEnd: { $lt: now },
        status: { $in: ['ACTIVE', 'TRIALING'] }
      }).toArray();
      
      this.logger.logDatabase('FIND_EXPIRED', 'subscriptions');
      
      return subscriptionsData.map(data => Subscription.fromData(data));
    } catch (error) {
      this.logger.logDatabase('FIND_EXPIRED', 'subscriptions', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando suscripciones expiradas', error);
    }
  }

  public async findSubscriptionsEndingInDays(days: number): Promise<Subscription[]> {
    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
      
      const subscriptionsData = await this.collection.find({
        currentPeriodEnd: { 
          $gte: now,
          $lte: futureDate 
        },
        status: { $in: ['ACTIVE', 'TRIALING'] },
        cancelAtPeriodEnd: false
      }).toArray();
      
      this.logger.logDatabase('FIND_ENDING_IN_DAYS', 'subscriptions');
      
      return subscriptionsData.map(data => Subscription.fromData(data));
    } catch (error) {
      this.logger.logDatabase('FIND_ENDING_IN_DAYS', 'subscriptions', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando suscripciones próximas a vencer', error);
    }
  }

  public async findActiveSubscriptionsByPlan(plan: string): Promise<Subscription[]> {
    try {
      const subscriptionsData = await this.collection.find({
        plan,
        status: { $in: ['ACTIVE', 'TRIALING'] }
      }).toArray();
      
      this.logger.logDatabase('FIND_BY_PLAN', 'subscriptions');
      
      return subscriptionsData.map(data => Subscription.fromData(data));
    } catch (error) {
      this.logger.logDatabase('FIND_BY_PLAN', 'subscriptions', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando suscripciones por plan', error);
    }
  }

  // Estadísticas
  public async countActiveSubscriptions(): Promise<number> {
    try {
      return await this.collection.countDocuments({
        status: { $in: ['ACTIVE', 'TRIALING'] }
      });
    } catch (error) {
      throw ErrorHandler.createDatabaseError('Error contando suscripciones activas', error);
    }
  }

  public async countSubscriptionsByPlan(plan: string): Promise<number> {
    try {
      return await this.collection.countDocuments({
        plan,
        status: { $in: ['ACTIVE', 'TRIALING'] }
      });
    } catch (error) {
      throw ErrorHandler.createDatabaseError('Error contando suscripciones por plan', error);
    }
  }

  public async countCanceledSubscriptions(): Promise<number> {
    try {
      return await this.collection.countDocuments({
        status: 'CANCELED'
      });
    } catch (error) {
      throw ErrorHandler.createDatabaseError('Error contando suscripciones canceladas', error);
    }
  }

  // Operaciones de limpieza
  public async cleanupExpiredSubscriptions(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.collection.deleteMany({
        status: 'CANCELED',
        updatedAt: { $lt: thirtyDaysAgo }
      });

      this.logger.logDatabase('CLEANUP_EXPIRED', 'subscriptions');
      return result.deletedCount || 0;
    } catch (error) {
      this.logger.logDatabase('CLEANUP_EXPIRED', 'subscriptions', undefined, error);
      throw ErrorHandler.createDatabaseError('Error limpiando suscripciones expiradas', error);
    }
  }
}