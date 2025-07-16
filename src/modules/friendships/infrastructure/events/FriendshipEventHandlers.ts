// src/modules/friendships/infrastructure/events/FriendshipEventHandlers.ts
import { LoggerService } from '../../../../shared/services/LoggerService';
import { EventBus } from '../../../../shared/events/EventBus';
import { 
  FRIENDSHIP_EVENT_TYPES,
  FriendRequestSentEvent,
  FriendRequestAcceptedEvent,
  FriendRequestRejectedEvent,
  FriendshipRemovedEvent
} from '../../domain/FriendshipEvents';

export class FriendshipEventHandlers {
  private logger: LoggerService;

  constructor() {
    this.logger = LoggerService.getInstance();
    this.registerEventHandlers();
  }

  private registerEventHandlers(): void {
    const eventBus = EventBus.getInstance();

    eventBus.subscribe(
      FRIENDSHIP_EVENT_TYPES.FRIEND_REQUEST_SENT,
      this.handleFriendRequestSent.bind(this)
    );

    eventBus.subscribe(
      FRIENDSHIP_EVENT_TYPES.FRIEND_REQUEST_ACCEPTED,
      this.handleFriendRequestAccepted.bind(this)
    );

    eventBus.subscribe(
      FRIENDSHIP_EVENT_TYPES.FRIEND_REQUEST_REJECTED,
      this.handleFriendRequestRejected.bind(this)
    );

    eventBus.subscribe(
      FRIENDSHIP_EVENT_TYPES.FRIENDSHIP_REMOVED,
      this.handleFriendshipRemoved.bind(this)
    );
  }

  private async handleFriendRequestSent(event: any): Promise<void> {
    try {
      this.logger.info('Procesando evento: Solicitud de amistad enviada', {
        eventType: event.eventType,
        requesterId: event.eventData.requesterId,
        recipientId: event.eventData.recipientId,
        friendshipId: event.eventData.friendshipId
      });

      // Aquí se pueden agregar acciones como:
      // - Enviar notificación push al destinatario
      // - Enviar email de notificación
      // - Actualizar contadores de estadísticas
      // - Registrar en analytics

      // Ejemplo de notificación (implementar según necesidad)
      // await this.notificationService.sendFriendRequestNotification(
      //   event.recipientId,
      //   event.requesterId
      // );

    } catch (error) {
      this.logger.error('Error procesando evento de solicitud enviada:', error);
    }
  }

  private async handleFriendRequestAccepted(event: any): Promise<void> {
    try {
      this.logger.info('Procesando evento: Solicitud de amistad aceptada', {
        eventType: event.eventType,
        requesterId: event.eventData.requesterId,
        recipientId: event.eventData.recipientId,
        friendshipId: event.eventData.friendshipId
      });

      // Aquí se pueden agregar acciones como:
      // - Enviar notificación al solicitante original
      // - Actualizar recomendaciones mutuas
      // - Registrar métricas de conversión
      // - Sugerir actividades conjuntas

      // Ejemplo de notificación
      // await this.notificationService.sendFriendRequestAcceptedNotification(
      //   event.requesterId,
      //   event.recipientId
      // );

    } catch (error) {
      this.logger.error('Error procesando evento de solicitud aceptada:', error);
    }
  }

  private async handleFriendRequestRejected(event: any): Promise<void> {
    try {
      this.logger.info('Procesando evento: Solicitud de amistad rechazada', {
        eventType: event.eventType,
        requesterId: event.eventData.requesterId,
        recipientId: event.eventData.recipientId,
        friendshipId: event.eventData.friendshipId
      });

      // Aquí se pueden agregar acciones como:
      // - Registrar métricas de rechazo
      // - Actualizar algoritmo de sugerencias
      // - No enviar notificación al solicitante (por privacidad)

    } catch (error) {
      this.logger.error('Error procesando evento de solicitud rechazada:', error);
    }
  }

  private async handleFriendshipRemoved(event: any): Promise<void> {
    try {
      this.logger.info('Procesando evento: Amistad eliminada', {
        eventType: event.eventType,
        userId: event.eventData.userId,
        friendId: event.eventData.friendId,
        friendshipId: event.eventData.friendshipId
      });

      // Aquí se pueden agregar acciones como:
      // - Actualizar recomendaciones
      // - Limpiar datos compartidos si es necesario
      // - Registrar métricas de retención

    } catch (error) {
      this.logger.error('Error procesando evento de amistad eliminada:', error);
    }
  }
}