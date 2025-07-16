// src/modules/subscriptions/infrastructure/repositories/PlanMongoRepository.ts
import { Collection } from 'mongodb';
import { Plan, PlanData } from '../../domain/Plan';
import { IPlanRepository } from '../../domain/interfaces/IPlanRepository';
import { DatabaseConnection } from '../../../../shared/database/Connection';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';

export class PlanMongoRepository implements IPlanRepository {
  private collection: Collection<PlanData>;
  private logger: LoggerService;

  constructor() {
    const db = DatabaseConnection.getInstance().getDatabase();
    this.collection = db.collection<PlanData>('plans');
    this.logger = LoggerService.getInstance();
    
    this.createIndexes();
  }

  private async createIndexes(): Promise<void> {
    try {
      await Promise.all([
        this.collection.createIndex({ code: 1 }, { unique: true, background: true }),
        this.collection.createIndex({ isActive: 1 }, { background: true }),
        this.collection.createIndex({ displayOrder: 1 }, { background: true }),
        this.collection.createIndex({ monthlyPrice: 1 }, { background: true }),
        this.collection.createIndex({ yearlyPrice: 1 }, { background: true })
      ]);
      
      this.logger.info('Índices de planes creados exitosamente');
    } catch (error) {
      this.logger.error('Error creando índices de planes:', error);
    }
  }

  public async create(plan: Plan): Promise<void> {
    try {
      const planData = plan.toData();
      await this.collection.insertOne(planData);
      
      this.logger.logDatabase('INSERT', 'plans');
    } catch (error) {
      this.logger.logDatabase('INSERT', 'plans', undefined, error);
      throw ErrorHandler.createDatabaseError('Error creando plan', error);
    }
  }

  public async findById(id: string): Promise<Plan | null> {
    try {
      const startTime = Date.now();
      const planData = await this.collection.findOne({ id });
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_BY_ID', 'plans', duration);
      
      return planData ? Plan.fromData(planData) : null;
    } catch (error) {
      this.logger.logDatabase('FIND_BY_ID', 'plans', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando plan por ID', error);
    }
  }

  public async findByCode(code: string): Promise<Plan | null> {
    try {
      const startTime = Date.now();
      const planData = await this.collection.findOne({ code });
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_BY_CODE', 'plans', duration);
      
      return planData ? Plan.fromData(planData) : null;
    } catch (error) {
      this.logger.logDatabase('FIND_BY_CODE', 'plans', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando plan por código', error);
    }
  }

  public async update(plan: Plan): Promise<void> {
    try {
      const planData = plan.toData();
      planData.updatedAt = new Date();
      
      const result = await this.collection.updateOne(
        { id: plan.id },
        { $set: planData }
      );

      if (result.matchedCount === 0) {
        throw new Error('Plan no encontrado');
      }
      
      this.logger.logDatabase('UPDATE', 'plans');
    } catch (error) {
      this.logger.logDatabase('UPDATE', 'plans', undefined, error);
      throw ErrorHandler.createDatabaseError('Error actualizando plan', error);
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const result = await this.collection.deleteOne({ id });

      if (result.deletedCount === 0) {
        throw new Error('Plan no encontrado');
      }
      
      this.logger.logDatabase('DELETE', 'plans');
    } catch (error) {
      this.logger.logDatabase('DELETE', 'plans', undefined, error);
      throw ErrorHandler.createDatabaseError('Error eliminando plan', error);
    }
  }

  public async findActivePlans(): Promise<Plan[]> {
    try {
      const startTime = Date.now();
      const plansData = await this.collection.find({ isActive: true }).toArray();
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_ACTIVE', 'plans', duration);
      
      return plansData.map(data => Plan.fromData(data));
    } catch (error) {
      this.logger.logDatabase('FIND_ACTIVE', 'plans', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando planes activos', error);
    }
  }

  public async findPlansByPriceRange(minPrice: number, maxPrice: number): Promise<Plan[]> {
    try {
      const plansData = await this.collection.find({
        monthlyPrice: { $gte: minPrice, $lte: maxPrice },
        isActive: true
      }).toArray();
      
      this.logger.logDatabase('FIND_BY_PRICE_RANGE', 'plans');
      
      return plansData.map(data => Plan.fromData(data));
    } catch (error) {
      this.logger.logDatabase('FIND_BY_PRICE_RANGE', 'plans', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando planes por rango de precio', error);
    }
  }

  public async findPlansByFeature(feature: string): Promise<Plan[]> {
    try {
      const plansData = await this.collection.find({
        features: { $in: [feature] },
        isActive: true
      }).toArray();
      
      this.logger.logDatabase('FIND_BY_FEATURE', 'plans');
      
      return plansData.map(data => Plan.fromData(data));
    } catch (error) {
      this.logger.logDatabase('FIND_BY_FEATURE', 'plans', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando planes por característica', error);
    }
  }

  public async findOrderedPlans(): Promise<Plan[]> {
    try {
      const startTime = Date.now();
      const plansData = await this.collection.find({ isActive: true })
        .sort({ displayOrder: 1 })
        .toArray();
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_ORDERED', 'plans', duration);
      
      return plansData.map(data => Plan.fromData(data));
    } catch (error) {
      this.logger.logDatabase('FIND_ORDERED', 'plans', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando planes ordenados', error);
    }
  }

  public async updateDisplayOrder(planId: string, newOrder: number): Promise<void> {
    try {
      const result = await this.collection.updateOne(
        { id: planId },
        { $set: { displayOrder: newOrder, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        throw new Error('Plan no encontrado');
      }
      
      this.logger.logDatabase('UPDATE_ORDER', 'plans');
    } catch (error) {
      this.logger.logDatabase('UPDATE_ORDER', 'plans', undefined, error);
      throw ErrorHandler.createDatabaseError('Error actualizando orden de plan', error);
    }
  }
}