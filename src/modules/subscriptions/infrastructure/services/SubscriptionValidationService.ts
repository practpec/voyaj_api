// src/modules/subscriptions/infrastructure/services/SubscriptionValidationService.ts
import { ISubscriptionRepository } from '../../domain/interfaces/ISubscriptionRepository';
import { FeatureAccessDTO } from '../../application/dtos/SubscriptionDTO';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';

export class SubscriptionValidationService {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private logger: LoggerService
  ) {}

  // Validar acceso completo a funcionalidades
  public async validateFeatureAccess(userId: string): Promise<FeatureAccessDTO> {
    try {
      const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
      
      if (!subscription) {
        // Plan gratuito por defecto
        return {
          canCreateTrip: false, // Ya tiene el máximo (1)
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

      const limits = subscription.planLimits;

      return {
        canCreateTrip: limits.activeTrips === -1 || limits.activeTrips > 0,
        canUploadPhotos: limits.photosPerTrip === -1 || limits.photosPerTrip > 0,
        remainingPhotos: limits.photosPerTrip === -1 ? undefined : limits.photosPerTrip,
        canUseGroupTrips: limits.groupTripParticipants > 0,
        canUseOfflineMode: limits.offlineMode,
        availableExportFormats: limits.exportFormats
      };

    } catch (error) {
      this.logger.error(`Error validando acceso para usuario ${userId}:`, error);
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

      // Plan de pago
      if (subscription.planLimits.activeTrips === -1) {
        return { canCreate: true }; // Ilimitado
      }

      if (existingTripsCount >= subscription.planLimits.activeTrips) {
        return {
          canCreate: false,
          reason: `Has alcanzado el límite de ${subscription.planLimits.activeTrips} viajes activos`,
          upgradeRequired: subscription.plan === 'AVENTURERO' ? 'EXPEDICIONARIO' : undefined
        };
      }

      return { canCreate: true };

    } catch (error) {
      this.logger.error(`Error validando creación de viaje para usuario ${userId}:`, error);
      throw error;
    }
  }

  // Validar si puede subir fotos
  public async canUploadPhotos(userId: string, tripId: string, currentPhotoCount: number): Promise<{
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

      // Plan de pago
      if (subscription.planLimits.photosPerTrip === -1) {
        return { canUpload: true }; // Ilimitado
      }

      const remaining = Math.max(0, subscription.planLimits.photosPerTrip - currentPhotoCount);
      
      if (remaining === 0) {
        return {
          canUpload: false,
          remainingPhotos: 0,
          reason: `Has alcanzado el límite de ${subscription.planLimits.photosPerTrip} fotos por viaje`,
          upgradeRequired: subscription.plan === 'AVENTURERO' ? 'EXPEDICIONARIO' : undefined
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

      if (subscription.planLimits.groupTripParticipants === 0) {
        return {
          canUse: false,
          reason: 'Los viajes grupales no están disponibles en tu plan actual',
          upgradeRequired: 'AVENTURERO'
        };
      }

      return {
        canUse: true,
        maxParticipants: subscription.planLimits.groupTripParticipants === -1 ? 
          undefined : subscription.planLimits.groupTripParticipants
      };

    } catch (error) {
      this.logger.error(`Error validando viajes grupales para usuario ${userId}:`, error);
      throw error;
    }
  }

  // Validar si puede agregar participantes a un viaje grupal
  public async canAddParticipant(userId: string, currentParticipants: number): Promise<{
    canAdd: boolean;
    remainingSlots?: number;
    reason?: string;
    upgradeRequired?: string;
  }> {
    try {
      const groupAccess = await this.canUseGroupTrips(userId);
      
      if (!groupAccess.canUse) {
        return {
          canAdd: false,
          reason: groupAccess.reason,
          upgradeRequired: groupAccess.upgradeRequired
        };
      }

      const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
      
      if (!subscription) {
        return { canAdd: false, reason: 'Suscripción no encontrada' };
      }

      // Si es ilimitado
      if (subscription.planLimits.groupTripParticipants === -1) {
        return { canAdd: true };
      }

      const remaining = Math.max(0, subscription.planLimits.groupTripParticipants - currentParticipants);
      
      if (remaining === 0) {
        return {
          canAdd: false,
          remainingSlots: 0,
          reason: `Has alcanzado el límite de ${subscription.planLimits.groupTripParticipants} participantes`,
          upgradeRequired: subscription.plan === 'AVENTURERO' ? 'EXPEDICIONARIO' : undefined
        };
      }

      return {
        canAdd: true,
        remainingSlots: remaining
      };

    } catch (error) {
      this.logger.error(`Error validando adición de participante para usuario ${userId}:`, error);
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
        availableFormats = subscription.planLimits.exportFormats;
      }

      const canExport = availableFormats.includes(format.toUpperCase());
      
      if (!canExport) {
        let upgradeRequired = 'AVENTURERO';
        if (subscription?.plan === 'AVENTURERO' && !['PDF', 'JSON', 'ZIP'].includes(format.toUpperCase())) {
          upgradeRequired = 'EXPEDICIONARIO';
        }

        return {
          canExport: false,
          reason: `El formato ${format} no está disponible en tu plan actual`,
          upgradeRequired,
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

  // Validar modo offline
  public async canUseOfflineMode(userId: string): Promise<{
    canUse: boolean;
    reason?: string;
    upgradeRequired?: string;
  }> {
    try {
      const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
      
      if (!subscription) {
        return {
          canUse: false,
          reason: 'El modo offline no está disponible en el plan gratuito',
          upgradeRequired: 'AVENTURERO'
        };
      }

      if (!subscription.planLimits.offlineMode) {
        return {
          canUse: false,
          reason: 'El modo offline no está disponible en tu plan actual',
          upgradeRequired: 'AVENTURERO'
        };
      }

      return { canUse: true };

    } catch (error) {
      this.logger.error(`Error validando modo offline para usuario ${userId}:`, error);
      throw error;
    }
  }

  // Verificar estado de suscripción
  public async getSubscriptionStatus(userId: string): Promise<{
    hasActiveSubscription: boolean;
    plan: string;
    status: string;
    expiresAt?: Date;
    daysUntilExpiration?: number;
    needsAction?: boolean;
    actionRequired?: string;
  }> {
    try {
      const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
      
      if (!subscription) {
        return {
          hasActiveSubscription: false,
          plan: 'EXPLORADOR',
          status: 'INACTIVE'
        };
      }

      const now = Date.now();
      const expirationTime = subscription.currentPeriodEnd.getTime();
      const daysUntilExpiration = Math.ceil((expirationTime - now) / (1000 * 60 * 60 * 24));

      let needsAction = false;
      let actionRequired = '';

      // Verificar si necesita acción
      if (subscription.status === 'PAST_DUE') {
        needsAction = true;
        actionRequired = 'Actualizar método de pago';
      } else if (subscription.isCanceled && daysUntilExpiration <= 7) {
        needsAction = true;
        actionRequired = 'Renovar suscripción antes del vencimiento';
      } else if (subscription.isTrialing && daysUntilExpiration <= 3) {
        needsAction = true;
        actionRequired = 'Agregar método de pago antes de que termine el trial';
      }

      return {
        hasActiveSubscription: subscription.isActive,
        plan: subscription.plan,
        status: subscription.status,
        expiresAt: subscription.currentPeriodEnd,
        daysUntilExpiration: Math.max(0, daysUntilExpiration),
        needsAction,
        actionRequired
      };

    } catch (error) {
      this.logger.error(`Error obteniendo estado de suscripción para usuario ${userId}:`, error);
      throw error;
    }
  }

  // Validar múltiples funcionalidades de una vez
  public async validateMultipleFeatures(
    userId: string, 
    features: string[]
  ): Promise<Record<string, { available: boolean; reason?: string; upgradeRequired?: string }>> {
    try {
      const results: Record<string, any> = {};

      for (const feature of features) {
        switch (feature) {
          case 'groupTrips':
            results[feature] = await this.canUseGroupTrips(userId);
            break;
          case 'offlineMode':
            results[feature] = await this.canUseOfflineMode(userId);
            break;
          default:
            results[feature] = { available: false, reason: 'Funcionalidad no reconocida' };
        }
      }

      return results;

    } catch (error) {
      this.logger.error(`Error validando múltiples funcionalidades para usuario ${userId}:`, error);
      throw error;
    }
  }
}