// src/modules/subscriptions/domain/Plan.ts
import { SecurityUtils } from '../../../shared/utils/SecurityUtils';

export interface PlanLimits {
  activeTrips: number;
  photosPerTrip: number;
  groupTripParticipants: number;
  exportFormats: string[];
  offlineMode: boolean;
}

export interface PlanData {
  id: string;
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  features: string[];
  limits: PlanLimits;
  isActive: boolean;
  displayOrder: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}

export class Plan {
  private data: PlanData;

  constructor(planData: PlanData) {
    this.data = { ...planData };
    this.validate();
  }

  // Getters
  public get id(): string {
    return this.data.id;
  }

  public get code(): string {
    return this.data.code;
  }

  public get name(): string {
    return this.data.name;
  }

  public get description(): string {
    return this.data.description;
  }

  public get monthlyPrice(): number {
    return this.data.monthlyPrice;
  }

  public get yearlyPrice(): number {
    return this.data.yearlyPrice;
  }

  public get currency(): string {
    return this.data.currency;
  }

  public get stripePriceIdMonthly(): string | undefined {
    return this.data.stripePriceIdMonthly;
  }

  public get stripePriceIdYearly(): string | undefined {
    return this.data.stripePriceIdYearly;
  }

  public get features(): string[] {
    return [...this.data.features];
  }

  public get limits(): PlanLimits {
    return { ...this.data.limits };
  }

  public get isActive(): boolean {
    return this.data.isActive;
  }

  public get displayOrder(): number {
    return this.data.displayOrder;
  }

  public get isFree(): boolean {
    return this.data.monthlyPrice === 0 && this.data.yearlyPrice === 0;
  }

  // Crear nuevo plan
  public static create(
    code: string,
    name: string,
    description: string,
    monthlyPrice: number,
    yearlyPrice: number,
    limits: PlanLimits,
    features: string[]
  ): Plan {
    const planId = SecurityUtils.generateUUID();
    const now = new Date();

    const planData: PlanData = {
      id: planId,
      code,
      name,
      description,
      monthlyPrice,
      yearlyPrice,
      currency: 'MXN',
      features,
      limits,
      isActive: true,
      displayOrder: 0,
      createdAt: now
    };

    return new Plan(planData);
  }

  // Actualizar plan
  public update(updates: Partial<PlanData>): void {
    this.data = { ...this.data, ...updates, updatedAt: new Date() };
    this.validate();
  }

  // Activar/desactivar plan
  public toggleActive(): void {
    this.data.isActive = !this.data.isActive;
    this.data.updatedAt = new Date();
  }

  // Verificar si permite cierta característica
  public allowsFeature(feature: string): boolean {
    switch (feature) {
      case 'unlimited_trips':
        return this.data.limits.activeTrips === -1;
      case 'group_trips':
        return this.data.limits.groupTripParticipants > 0;
      case 'offline_mode':
        return this.data.limits.offlineMode;
      case 'export_pdf':
        return this.data.limits.exportFormats.includes('PDF');
      case 'export_json':
        return this.data.limits.exportFormats.includes('JSON');
      default:
        return true;
    }
  }

  private validate(): void {
    if (!this.data.id) {
      throw new Error('ID de plan requerido');
    }

    if (!this.data.code) {
      throw new Error('Código de plan requerido');
    }

    if (!this.data.name) {
      throw new Error('Nombre de plan requerido');
    }

    if (this.data.monthlyPrice < 0 || this.data.yearlyPrice < 0) {
      throw new Error('Los precios no pueden ser negativos');
    }
  }

  // Convertir a objeto plano para persistencia
  public toData(): PlanData {
    return { ...this.data };
  }

  // Crear instancia desde datos existentes
  public static fromData(planData: PlanData): Plan {
    return new Plan(planData);
  }
}