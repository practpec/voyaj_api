import { EventEmitter } from 'events';
import { LoggerService } from '../services/LoggerService';

export interface DomainEvent {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  eventData: any;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

export type EventHandler<T = any> = (event: DomainEvent & { eventData: T }) => Promise<void> | void;

export class EventBus {
  private static instance: EventBus;
  private eventEmitter: EventEmitter;
  private logger: LoggerService;
  private handlers: Map<string, EventHandler[]>;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(100); // Aumentar límite de listeners
    this.logger = LoggerService.getInstance();
    this.handlers = new Map();
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  // Publicar un evento
  public async publish(event: DomainEvent): Promise<void> {
    try {
      this.logger.debug(`Publishing event: ${event.eventType}`, {
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        timestamp: event.timestamp
      });

      // Emitir el evento
      this.eventEmitter.emit(event.eventType, event);
      
      // También emitir un evento genérico para listeners globales
      this.eventEmitter.emit('*', event);

    } catch (error) {
      this.logger.error(`Error publishing event ${event.eventType}:`, error);
      throw error;
    }
  }

  // Suscribirse a un evento específico
  public subscribe<T = any>(eventType: string, handler: EventHandler<T>): void {
    try {
      // Agregar al mapa de handlers
      if (!this.handlers.has(eventType)) {
        this.handlers.set(eventType, []);
      }
      this.handlers.get(eventType)!.push(handler);

      // Wrapper para manejar errores
      const wrappedHandler = async (event: DomainEvent) => {
        try {
          await handler(event as DomainEvent & { eventData: T });
        } catch (error) {
          this.logger.error(`Error in event handler for ${eventType}:`, {
            error,
            event: {
              eventType: event.eventType,
              aggregateId: event.aggregateId,
              aggregateType: event.aggregateType
            }
          });
        }
      };

      this.eventEmitter.on(eventType, wrappedHandler);
      
      this.logger.debug(`Subscribed to event: ${eventType}`);
    } catch (error) {
      this.logger.error(`Error subscribing to event ${eventType}:`, error);
      throw error;
    }
  }

  // Suscribirse a todos los eventos
  public subscribeToAll(handler: EventHandler): void {
    this.subscribe('*', handler);
  }

  // Desuscribirse de un evento
  public unsubscribe(eventType: string, handler: EventHandler): void {
    try {
      this.eventEmitter.removeListener(eventType, handler);
      
      // Remover del mapa de handlers
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
        
        if (handlers.length === 0) {
          this.handlers.delete(eventType);
        }
      }
      
      this.logger.debug(`Unsubscribed from event: ${eventType}`);
    } catch (error) {
      this.logger.error(`Error unsubscribing from event ${eventType}:`, error);
    }
  }

  // Obtener número de listeners para un evento
  public getListenerCount(eventType: string): number {
    return this.eventEmitter.listenerCount(eventType);
  }

  // Obtener todos los tipos de eventos registrados
  public getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }

  // Limpiar todos los listeners
  public removeAllListeners(): void {
    this.eventEmitter.removeAllListeners();
    this.handlers.clear();
    this.logger.info('All event listeners removed');
  }

  // Crear un evento de dominio
  public static createEvent(
    eventType: string,
    aggregateId: string,
    aggregateType: string,
    eventData: any,
    userId?: string,
    metadata?: Record<string, any>
  ): DomainEvent {
    return {
      eventType,
      aggregateId,
      aggregateType,
      eventData,
      timestamp: new Date(),
      userId,
      metadata
    };
  }

  // Método helper para publicar eventos de usuario
  public async publishUserEvent(
    eventType: string,
    userId: string,
    eventData: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event = EventBus.createEvent(
      eventType,
      userId,
      'User',
      eventData,
      userId,
      metadata
    );
    
    await this.publish(event);
  }

  // Método helper para publicar eventos de viaje
  public async publishTripEvent(
    eventType: string,
    tripId: string,
    eventData: any,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event = EventBus.createEvent(
      eventType,
      tripId,
      'Trip',
      eventData,
      userId,
      metadata
    );
    
    await this.publish(event);
  }

  // Obtener estadísticas del event bus
  public getStats(): {
    totalEvents: number;
    totalHandlers: number;
    eventTypes: string[];
    maxListeners: number;
  } {
    let totalHandlers = 0;
    for (const handlers of this.handlers.values()) {
      totalHandlers += handlers.length;
    }

    return {
      totalEvents: this.handlers.size,
      totalHandlers,
      eventTypes: this.getRegisteredEvents(),
      maxListeners: this.eventEmitter.getMaxListeners()
    };
  }
}