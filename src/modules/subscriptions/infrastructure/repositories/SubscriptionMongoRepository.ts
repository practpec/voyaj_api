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