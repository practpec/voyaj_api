// src/modules/subscriptions/domain/interfaces/ISubscriptionRepository.ts
import { Subscription } from '../Subscription';

export interface ISubscriptionRepository {
  // Operaciones básicas CRUD
  create(subscription: Subscription): Promise<void>;
  findById(id: string): Promise<Subscription | null>;
  update(subscription: Subscription): Promise<void>;
  delete(id: string): Promise<void>;

  // Operaciones específicas de suscripciones
  findActiveByUserId(userId: string): Promise<Subscription | null>;
  findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null>;
  findByStripeCustomerId(stripeCustomerId: string): Promise<Subscription[]>;

  // Consultas de estado
  findExpiredSubscriptions(): Promise<Subscription[]>;
  findSubscriptionsEndingInDays(days: number): Promise<Subscription[]>;
  findActiveSubscriptionsByPlan(planId: string): Promise<Subscription[]>;

  // Estadísticas
  countActiveSubscriptions(): Promise<number>;
  countSubscriptionsByPlan(planId: string): Promise<number>;
  countCanceledSubscriptions(): Promise<number>;

  // Operaciones de limpieza
  cleanupExpiredSubscriptions(): Promise<number>;
}