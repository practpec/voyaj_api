// src/modules/subscriptions/domain/interfaces/IPlanRepository.ts
import { Plan } from '../Plan';

export interface IPlanRepository {
  // Operaciones básicas CRUD
  create(plan: Plan): Promise<void>;
  findById(id: string): Promise<Plan | null>;
  findByCode(code: string): Promise<Plan | null>;
  update(plan: Plan): Promise<void>;
  delete(id: string): Promise<void>;

  // Consultas específicas
  findActivePlans(): Promise<Plan[]>;
  findPlansByPriceRange(minPrice: number, maxPrice: number): Promise<Plan[]>;
  findPlansByFeature(feature: string): Promise<Plan[]>;
  
  // Operaciones de orden
  findOrderedPlans(): Promise<Plan[]>;
  updateDisplayOrder(planId: string, newOrder: number): Promise<void>;
}