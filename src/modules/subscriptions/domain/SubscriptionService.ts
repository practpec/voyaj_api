// src/modules/subscriptions/domain/SubscriptionService.ts
import { Subscription } from './Subscription';
import { Plan } from './Plan';
import { ISubscriptionRepository } from './interfaces/ISubscriptionRepository';
import { IPlanRepository } from './interfaces/IPlanRepository';
import { SubscriptionEvents } from './SubscriptionEvents';
import { EventBus } from '../../../shared/events/EventBus';
import { LoggerService } from '../../../shared/services/LoggerService';

export class SubscriptionService {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private planRepository: IPlanRepository,
    private eventBus: EventBus,
    private logger: LoggerService
  ) {}

  // Verificar si un usuario puede crear más viajes
  public async canCreateTrip(userId: string): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
    
    if (!subscription) {
      return false;
    }

    const plan = await this.planRepository.findById(subscription.planId);
    if (!plan) {
      return false;
    }

    return plan.limits.activeTrips === -1 || plan.limits.activeTrips > 0;
  }

  // Verificar si un usuario puede subir más fotos a un viaje
  public async canUploadPhotos(userId: string, currentPhotoCount: number): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
    
    if (!subscription) {
      return currentPhotoCount < 10; // Plan gratuito por defecto
    }

    const plan = await this.planRepository.findById(subscription.planId);
    if (!plan) {
      return false;
    }

    if (plan.limits.photosPerTrip === -1) {
      return true; // Ilimitado
    }

    return currentPhotoCount < plan.limits.photosPerTrip;
  }

  // Verificar si un usuario puede agregar participantes a un viaje grupal
  public async canAddGroupParticipant(userId: string, currentParticipants: number): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
    
    if (!subscription) {
      return false; // Plan gratuito no permite viajes grupales
    }

    const plan = await this.planRepository.findById(subscription.planId);
    if (!plan) {
      return false;
    }

    if (plan.limits.groupTripParticipants === 0) {
      return false;
    }

    if (plan.limits.groupTripParticipants === -1) {
      return true; // Ilimitado
    }

    return currentParticipants < plan.limits.groupTripParticipants;
  }

  // Verificar si un usuario puede usar modo offline
  public async canUseOfflineMode(userId: string): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
    
    if (!subscription) {
      return false;
    }

    const plan = await this.planRepository.findById(subscription.planId);
    return plan ? plan.limits.offlineMode : false;
  }

  // Verificar qué formatos de exportación están disponibles
  public async getAvailableExportFormats(userId: string): Promise<string[]> {
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
    
    if (!subscription) {
      return ['PDF']; // Plan gratuito básico
    }

    const plan = await this.planRepository.findById(subscription.planId);
    return plan ? plan.limits.exportFormats : ['PDF'];
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

    // Buscar plan gratuito
    const freePlan = await this.planRepository.findByCode('EXPLORADOR');
    if (!freePlan) {
      this.logger.error('Plan gratuito no encontrado');
      return;
    }

    // Cambiar a plan gratuito
    subscription.changePlan(freePlan.id);
    await this.subscriptionRepository.update(subscription);

    // Emitir evento
    const event = SubscriptionEvents.subscriptionExpired({
      subscriptionId: subscription.id,
      userId: subscription.userId,
      planCode: freePlan.code,
      expiredAt: new Date()
    });

    await this.eventBus.publishTripEvent(event.eventType, subscriptionId, event.eventData);

    this.logger.info(`Trial expirado para suscripción: ${subscriptionId}`);
  }

  // Notificar trial próximo a expirar
  public async notifyTrialEndingSoon(): Promise<void> {
    const subscriptionsEndingSoon = await this.subscriptionRepository.findSubscriptionsEndingInDays(3);
    
    for (const subscription of subscriptionsEndingSoon) {
      if (subscription.isTrialing) {
        const plan = await this.planRepository.findById(subscription.planId);
        if (!plan) continue;

        const daysRemaining = Math.ceil(
          (subscription.data.trialEnd!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        const event = SubscriptionEvents.trialEndingSoon({
          subscriptionId: subscription.id,
          userId: subscription.userId,
          planCode: plan.code,
          trialEndDate: subscription.data.trialEnd!,
          daysRemaining
        });

        await this.eventBus.publishTripEvent(event.eventType, subscription.id, event.eventData);
      }
    }
  }

  // Limpiar suscripciones expiradas
  public async cleanupExpiredSubscriptions(): Promise<number> {
    const deleted = await this.subscriptionRepository.cleanupExpiredSubscriptions();
    
    this.logger.info(`Limpieza completada: ${deleted} suscripciones eliminadas`);
    return deleted;
  }

  // Obtener estadísticas de suscripciones
  public async getSubscriptionStats(): Promise<{
    totalActive: number;
    byPlan: Record<string, number>;
    totalCanceled: number;
  }> {
    const [totalActive, totalCanceled, activePlans] = await Promise.all([
      this.subscriptionRepository.countActiveSubscriptions(),
      this.subscriptionRepository.countCanceledSubscriptions(),
      this.planRepository.findActivePlans()
    ]);

    const byPlan: Record<string, number> = {};
    
    for (const plan of activePlans) {
      byPlan[plan.code] = await this.subscriptionRepository.countSubscriptionsByPlan(plan.id);
    }

    return {
      totalActive,
      totalCanceled,
      byPlan
    };
  }
}