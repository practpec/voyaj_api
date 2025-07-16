// src/modules/trips/domain/Trip.ts
import { ObjectId } from 'mongodb';

export interface ITripCreationParams {
  userId: string;
  title: string;
  destination: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  estimatedBudget?: number;
  baseCurrency?: string;
  isGroupTrip?: boolean;
  category?: string;
  image?: string;
}

export interface ITripUpdateParams {
  title?: string;
  destination?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  estimatedBudget?: number;
  baseCurrency?: string;
  category?: string;
  image?: string;
}

export enum TripStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TripCategory {
  VACATION = 'vacation',
  BUSINESS = 'business',
  ADVENTURE = 'adventure',
  CULTURE = 'culture',
  FAMILY = 'family',
  ROMANTIC = 'romantic',
  OTHER = 'other'
}

export class Trip {
  public _id: ObjectId;
  public userId: string;
  public title: string;
  public destination: string;
  public description?: string;
  public startDate: Date;
  public endDate: Date;
  public estimatedBudget?: number;
  public actualExpense: number;
  public baseCurrency: string;
  public isActive: boolean;
  public isGroupTrip: boolean;
  public category: TripCategory;
  public image?: string;
  public planningProgress: number;
  public status: TripStatus;
  public isDeleted: boolean;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(params: ITripCreationParams) {
    this._id = new ObjectId();
    this.userId = params.userId;
    this.title = params.title;
    this.destination = params.destination;
    this.description = params.description;
    this.startDate = params.startDate;
    this.endDate = params.endDate;
    this.estimatedBudget = params.estimatedBudget || 0;
    this.actualExpense = 0;
    this.baseCurrency = params.baseCurrency || 'USD';
    this.isActive = true;
    this.isGroupTrip = params.isGroupTrip || false;
    this.category = (params.category as TripCategory) || TripCategory.VACATION;
    this.image = params.image;
    this.planningProgress = 0;
    this.status = TripStatus.DRAFT;
    this.isDeleted = false;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Métodos de negocio
  public update(params: ITripUpdateParams): void {
    if (params.title) this.title = params.title;
    if (params.destination) this.destination = params.destination;
    if (params.description !== undefined) this.description = params.description;
    if (params.startDate) this.startDate = params.startDate;
    if (params.endDate) this.endDate = params.endDate;
    if (params.estimatedBudget !== undefined) this.estimatedBudget = params.estimatedBudget;
    if (params.baseCurrency) this.baseCurrency = params.baseCurrency;
    if (params.category) this.category = params.category as TripCategory;
    if (params.image !== undefined) this.image = params.image;
    
    this.updatedAt = new Date();
  }

  public updateStatus(newStatus: TripStatus): void {
    this.status = newStatus;
    this.updatedAt = new Date();
  }

  public updatePlanningProgress(progress: number): void {
    this.planningProgress = Math.max(0, Math.min(100, progress));
    this.updatedAt = new Date();
  }

  public updateActualExpense(amount: number): void {
    this.actualExpense = Math.max(0, amount);
    this.updatedAt = new Date();
  }

  public softDelete(): void {
    this.isDeleted = true;
    this.isActive = false;
    this.updatedAt = new Date();
  }

  public restore(): void {
    this.isDeleted = false;
    this.isActive = true;
    this.updatedAt = new Date();
  }

  // Validaciones
  public validateDates(): boolean {
    return this.startDate < this.endDate;
  }

  public isDuringTrip(date: Date): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  public getTripDuration(): number {
    const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public canBeUpdated(): boolean {
    return !this.isDeleted && this.status !== TripStatus.CANCELLED;
  }

  public canBeDeleted(): boolean {
    return !this.isDeleted;
  }

  // Getters
  public get id(): string {
    return this._id.toString();
  }

  public get isCompleted(): boolean {
    return this.status === TripStatus.COMPLETED;
  }

  public get isCancelled(): boolean {
    return this.status === TripStatus.CANCELLED;
  }

  public get isDraft(): boolean {
    return this.status === TripStatus.DRAFT;
  }

  public get budgetRemaining(): number {
    if (!this.estimatedBudget) return 0;
    return this.estimatedBudget - this.actualExpense;
  }

  public get budgetUsedPercentage(): number {
    if (!this.estimatedBudget || this.estimatedBudget === 0) return 0;
    return Math.min(100, (this.actualExpense / this.estimatedBudget) * 100);
  }

  // Métodos de serialización
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      userId: this.userId,
      title: this.title,
      destination: this.destination,
      description: this.description,
      startDate: this.startDate,
      endDate: this.endDate,
      estimatedBudget: this.estimatedBudget,
      actualExpense: this.actualExpense,
      baseCurrency: this.baseCurrency,
      isActive: this.isActive,
      isGroupTrip: this.isGroupTrip,
      category: this.category,
      image: this.image,
      planningProgress: this.planningProgress,
      status: this.status,
      isDeleted: this.isDeleted,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      duration: this.getTripDuration(),
      budgetRemaining: this.budgetRemaining,
      budgetUsedPercentage: this.budgetUsedPercentage
    };
  }
}