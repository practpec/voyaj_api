// src/shared/events/DomainEvent.ts
export abstract class DomainEvent {
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly eventData: any;
  public readonly timestamp: Date;
  public readonly userId?: string;
  public readonly metadata?: Record<string, any>;

  constructor(
    eventType: string,
    eventData: any,
    aggregateId: string = '',
    aggregateType: string = '',
    userId?: string,
    metadata?: Record<string, any>
  ) {
    this.eventType = eventType;
    this.eventData = eventData;
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.timestamp = new Date();
    this.userId = userId;
    this.metadata = metadata;
  }
}