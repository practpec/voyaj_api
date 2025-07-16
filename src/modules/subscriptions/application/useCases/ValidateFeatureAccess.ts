// src/modules/subscriptions/application/useCases/ValidateFeatureAccess.ts
import { ISubscriptionRepository } from '../../domain/interfaces/ISubscriptionRepository';
import { IPlanRepository } from '../../domain/interfaces/IPlanRepository';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { FeatureAccessDTO } from '../dtos/SubscriptionDTO';

export interface ValidateFeatureAccessDTO {
  userId: string;
  feature?: string;
}

export class ValidateFeatureAccessUseCase {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private planRepository: IPlanRepository,
    private logger: LoggerService
  ) {}

  // Validar acceso completo a funcionalidades
  public async execute(dto: ValidateFeatureAccessDTO): Promise<FeatureAccessDTO> {
    try {
      const subscription = await this.subscriptionRepository.findActiveByUserId(dto.userId);
      
      if (!subscription) {
        // Plan gratuito por defecto
        return {
          canCreateTrip: false,
          canUploadPhotos: true,
          remainingPhotos: 10,
          canUseGroupTrips: false,
          canUseOfflineMode: false,
          availableExportFormats: ['PDF'],
          upgradeRequired: {
            feature: 'Crear más viajes',
            requiredPlan: 'AVENTURERO',
            currentPlan: 'EXPLORADOR'
          }
        };
      }

      const plan = await this.planRepository.findById(subscription.planId);
      if (!plan) {
        throw new Error('Plan no encontrado para la suscripción');
      }

      return {
        canCreateTrip: plan.limits.activeTrips === -1 || plan.limits.activeTrips > 0,
        canUploadPhotos: plan.limits.photosPerTrip === -1 || plan.limits.photosPerTrip > 0,
        remainingPhotos: plan.limits.photosPerTrip === -1 ? undefined : plan.limits.photosPerTrip,
        canUseGroupTrips: plan.limits.groupTripParticipants > 0,
        canUseOfflineMode: plan.limits.offlineMode,
        availableExportFormats: plan.limits.exportFormats
      };

    } catch (error) {
      this.logger.error(`Error validando acceso para usuario ${dto.userId}:`, error);
      throw ErrorHandler.createValidationError('Error validando acceso a funcionalidades');
    }
  }

  // Validar si puede crear un viaje específico
  public async canCreateTrip(userId: string, existingTripsCount: number): Promise<{
    canCreate: boolean;
    reason?: string;
    upgradeRequired?: string;
  }> {
    try {
      const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
      
      if (!subscription) {
        // Plan gratuito: máximo 1 viaje
        if (existingTripsCount >= 1) {
          return {
            canCreate: false,
            reason: 'Has alcanzado el límite de viajes para el plan gratuito',
            upgradeRequired: 'AVENTURERO'
          };
        }
        return { canCreate: true };
      }

      const plan = await this.planRepository.findById(subscription.planId);
      if (!plan) {
        return { canCreate: false, reason: 'Plan no encontrado' };
      }

      // Plan de pago
      if (plan.limits.activeTrips === -1) {
        return { canCreate: true }; // Ilimitado
      }

      if (existingTripsCount >= plan.limits.activeTrips) {
        return {
          canCreate: false,
          reason: `Has alcanzado el límite de ${plan.limits.activeTrips} viajes activos`,
          upgradeRequired: plan.code === 'AVENTURERO' ? 'EXPEDICIONARIO' : undefined
        };
      }

      return { canCreate: true };

    } catch (error) {
      this.logger.error(`Error validando creación de viaje para usuario ${userId}:`, error);
      throw error;
    }
  }

  // Validar si puede subir fotos
  public async canUploadPhotos(userId: string, currentPhotoCount: number): Promise<{
    canUpload: boolean;
    remainingPhotos?: number;
    reason?: string;
    upgradeRequired?: string;
  }> {
    try {
      const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
      
      if (!subscription) {
        // Plan gratuito: máximo 10 fotos por viaje
        const remaining = Math.max(0, 10 - currentPhotoCount);
        
        if (remaining === 0) {
          return {
            canUpload: false,
            remainingPhotos: 0,
            reason: 'Has alcanzado el límite de 10 fotos por viaje en el plan gratuito',
            upgradeRequired: 'AVENTURERO'
          };
        }

        return {
          canUpload: true,
          remainingPhotos: remaining
        };
      }

      const plan = await this.planRepository.findById(subscription.planId);
      if (!plan) {
        return { canUpload: false, reason: 'Plan no encontrado' };
      }

      // Plan de pago
      if (plan.limits.photosPerTrip === -1) {
        return { canUpload: true }; // Ilimitado
      }

      const remaining = Math.max(0, plan.limits.photosPerTrip - currentPhotoCount);
      
      if (remaining === 0) {
        return {
          canUpload: false,
          remainingPhotos: 0,
          reason: `Has alcanzado el límite de ${plan.limits.photosPerTrip} fotos por viaje`,
          upgradeRequired: plan.code === 'AVENTURERO' ? 'EXPEDICIONARIO' : undefined
        };
      }

      return {
        canUpload: true,
        remainingPhotos: remaining
      };

    } catch (error) {
      this.logger.error(`Error validando subida de fotos para usuario ${userId}:`, error);
      throw error;
    }
  }

  // Validar si puede usar viajes grupales
  public async canUseGroupTrips(userId: string): Promise<{
    canUse: boolean;
    maxParticipants?: number;
    reason?: string;
    upgradeRequired?: string;
  }> {
    try {
      const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
      
      if (!subscription) {
        return {
          canUse: false,
          reason: 'Los viajes grupales no están disponibles en el plan gratuito',
          upgradeRequired: 'AVENTURERO'
        };
      }

      const plan = await this.planRepository.findById(subscription.planId);
      if (!plan) {
        return { canUse: false, reason: 'Plan no encontrado' };
      }

      if (plan.limits.groupTripParticipants === 0) {
        return {
          canUse: false,
          reason: 'Los viajes grupales no están disponibles en tu plan actual',
          upgradeRequired: 'AVENTURERO'
        };
      }

      return {
        canUse: true,
        maxParticipants: plan.limits.groupTripParticipants === -1 ? 
          undefined : plan.limits.groupTripParticipants
      };

    } catch (error) {
      this.logger.error(`Error validando viajes grupales para usuario ${userId}:`, error);
      throw error;
    }
  }

  // Validar formato de exportación
  public async canExportFormat(userId: string, format: string): Promise<{
    canExport: boolean;
    reason?: string;
    upgradeRequired?: string;
    availableFormats: string[];
  }> {
    try {
      const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
      
      let availableFormats = ['PDF']; // Plan gratuito por defecto
      
      if (subscription) {
        const plan = await this.planRepository.findById(subscription.planId);
        if (plan) {
          availableFormats = plan.limits.exportFormats;
        }
      }

      const canExport = availableFormats.includes(format.toUpperCase());
      
      if (!canExport) {
        return {
          canExport: false,
          reason: `El formato ${format} no está disponible en tu plan actual`,
          upgradeRequired: 'AVENTURERO',
          availableFormats
        };
      }

      return {
        canExport: true,
        availableFormats
      };

    } catch (error) {
      this.logger.error(`Error validando formato de exportación para usuario ${userId}:`, error);
      throw error;
    }
  }
}