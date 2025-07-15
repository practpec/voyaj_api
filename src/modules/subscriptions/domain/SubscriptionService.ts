// src/modules/subscriptions/domain/SubscriptionService.ts
import { Subscription, SubscriptionPlan, SubscriptionStatus } from './Subscription';
import { ISubscriptionRepository } from './interfaces/ISubscriptionRepository';
import { SubscriptionEvents } from './SubscriptionEvents';
import { EventBus } from '../../../shared/events/EventBus';
import { LoggerService } from '../../../shared/services/LoggerService';

export class SubscriptionService {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private eventBus: EventBus,
    private logger: LoggerService
  ) {}

  // Verificar si un usuario puede crear más viajes
  public async canCreateTrip(userId: string): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
    
    if (!subscription) {
      // Sin suscripción = plan gratuito básico
      return false;
    }

    // Si es plan ilimitado
    if (subscription.planLimits.activeTrips === -1) {
      return true;
    }

    // Aquí necesitarías verificar cuántos viajes activos tiene el usuario
    // Por ahora retornamos true si tiene una suscripción activa
    return subscription.isActive;
  }

  // Verificar si un usuario puede subir más fotos a un viaje
  public async canUploadPhotos(userId: string, currentPhotoCount: number): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
    
    if (!subscription) {
      // Plan gratuito: 10 fotos por viaje
      return currentPhotoCount < 10;
    }

    // Si es plan ilimitado
    if (subscription.planLimits.photosPerTrip === -1) {
      return true;
    }

    return currentPhotoCount < subscription.planLimits.photosPerTrip;
  }

  // Verificar si un usuario puede agregar participantes a un viaje grupal
  public async canAddGroupParticipant(userId: string, currentParticipants: number): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
    
    if (!subscription) {
      // Plan gratuito: no permite viajes grupales
      return false;
    }

    // Si no permite viajes grupales
    if (subscription.planLimits.groupTripParticipants === 0) {
      return false;
    }

    // Si es ilimitado
    if (subscription.planLimits.groupTripParticipants === -1) {
      return true;
    }

    return currentParticipants < subscription.planLimits.groupTripParticipants;
  }

  // Verificar si un usuario puede usar modo offline
  public async canUseOfflineMode(userId: string): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
    
    if (!subscription) {
      return false;
    }

    return subscription.planLimits.offlineMode;
  }

  // Verificar qué formatos de exportación están disponibles
  public async getAvailableExportFormats(userId: string): Promise<string[]> {
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
    
    if (!subscription) {
      // Plan gratuito: solo PDF básico
      return ['PDF'];
    }

    return subscription.planLimits.exportFormats;
  }

  // Procesar la expiración de trial
  public async processTrialExpiration(subscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    
    if (!subscription) {
      this.logger.warn(`Suscripción no encontrada para procesar expiración: ${subscriptionId}`);
      return;
    }

    if (!subscription.isTrialing || subscription.isCanceled) {
      return;
    }

    // Cambiar a plan gratuito
    subscription.downgradeToFree();
    await this.subscriptionRepository.update(subscription);

    // Emitir evento
    const event = SubscriptionEvents.subscriptionExpired({
      subscriptionId: subscription.id,
      userId: subscription.userId,
      plan: subscription.plan,
      expiredAt: new Date()
    });

    await this.eventBus.publish(event.eventType, event.eventData);

    this.logger.info(`Trial expirado para suscripción: ${subscriptionId}`);
  }

  // Notificar trial próximo a expirar
  public async notifyTrialEndingSoon(): Promise<void> {
    // Buscar suscripciones que expiran en 3 días
    const subscriptionsEndingSoon = await this.subscriptionRepository.findSubscriptionsEndingInDays(3);
    
    for (const subscription of subscriptionsEndingSoon) {
      if (subscription.isTrialing) {
        const daysRemaining = Math.ceil(
          (subscription.data.trialEnd!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        const event = SubscriptionEvents.trialEndingSoon({
          subscriptionId: subscription.id,
          userId: subscription.userId,
          plan: subscription.plan,
          trialEndDate: subscription.data.trialEnd!,
          daysRemaining
        });

        await this.eventBus.publish(event.eventType, event.eventData);
      }
    }
  }

  // Validar cambio de plan
  public async validatePlanChange(
    userId: string, 
    currentPlan: SubscriptionPlan, 
    newPlan: SubscriptionPlan
  ): Promise<{ valid: boolean; reason?: string }> {
    
    // No se puede cambiar a un plan inferior si se exceden los límites
    if (this.isPlanDowngrade(currentPlan, newPlan)) {
      // Aquí verificarías si el usuario excede los límites del nuevo plan
      // Por ejemplo, si tiene más viajes activos que los permitidos
      
      // Por ahora permitimos todos los cambios
      return { valid: true };
    }

    return { valid: true };
  }

  // Limpiar suscripciones expiradas
  public async cleanupExpiredSubscriptions(): Promise<number> {
    const deleted = await this.subscriptionRepository.cleanupExpiredSubscriptions();
    
    this.logger.info(`Limpieza completada: ${deleted} suscripciones eliminadas`);
    return deleted;
  }

  // Métodos auxiliares privados
  private isPlanDowngrade(currentPlan: SubscriptionPlan, newPlan: SubscriptionPlan): boolean {
    const planHierarchy = {
      'EXPLORADOR': 0,
      'AVENTURERO': 1,
      'EXPEDICIONARIO': 2
    };

    return planHierarchy[newPlan] < planHierarchy[currentPlan];
  }

  // Obtener estadísticas de suscripciones
  public async getSubscriptionStats(): Promise<{
    totalActive: number;
    byPlan: Record<string, number>;
    totalCanceled: number;
  }> {
    const [totalActive, totalCanceled, explorerCount, adventurerCount, expeditionaryCount] = 
      await Promise.all([
        this.subscriptionRepository.countActiveSubscriptions(),
        this.subscriptionRepository.countCanceledSubscriptions(),
        this.subscriptionRepository.countSubscriptionsByPlan('EXPLORADOR'),
        this.subscriptionRepository.countSubscriptionsByPlan('AVENTURERO'),
        this.subscriptionRepository.countSubscriptionsByPlan('EXPEDICIONARIO')
      ]);

    return {
      totalActive,
      totalCanceled,
      byPlan: {
        'EXPLORADOR': explorerCount,
        'AVENTURERO': adventurerCount,
        'EXPEDICIONARIO': expeditionaryCount
      }
    };
  }
}