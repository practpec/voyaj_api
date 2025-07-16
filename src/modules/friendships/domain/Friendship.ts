// src/modules/friendships/domain/Friendship.ts
import { v4 as uuidv4 } from 'uuid';
import { FRIENDSHIP_STATUS } from '../../../shared/constants';

export interface FriendshipData {
  id: string;
  userId: string;
  friendId: string;
  status: 'pendiente' | 'aceptada' | 'rechazada';
  createdAt: Date;
  acceptedAt?: Date;
  isDeleted: boolean;
}

export class Friendship {
  constructor(
    private readonly id: string,
    private readonly userId: string,
    private readonly friendId: string,
    private status: 'pendiente' | 'aceptada' | 'rechazada',
    private readonly createdAt: Date,
    private acceptedAt?: Date,
    private isDeleted: boolean = false
  ) {}

  public static create(userId: string, friendId: string): Friendship {
    if (userId === friendId) {
      throw new Error('No puedes enviarte una solicitud de amistad a ti mismo');
    }

    return new Friendship(
      uuidv4(),
      userId,
      friendId,
      FRIENDSHIP_STATUS.PENDING,
      new Date(),
      undefined,
      false
    );
  }

  public static fromData(data: FriendshipData): Friendship {
    return new Friendship(
      data.id,
      data.userId,
      data.friendId,
      data.status,
      data.createdAt,
      data.acceptedAt,
      data.isDeleted
    );
  }

  public accept(): void {
    if (this.status !== FRIENDSHIP_STATUS.PENDING) {
      throw new Error('Solo se pueden aceptar solicitudes pendientes');
    }
    
    this.status = FRIENDSHIP_STATUS.ACCEPTED;
    this.acceptedAt = new Date();
  }

  public reject(): void {
    if (this.status !== FRIENDSHIP_STATUS.PENDING) {
      throw new Error('Solo se pueden rechazar solicitudes pendientes');
    }
    
    this.status = FRIENDSHIP_STATUS.REJECTED;
  }

  public remove(): void {
    this.isDeleted = true;
  }

  public restore(): void {
    this.isDeleted = false;
  }

  // Getters
  public getId(): string {
    return this.id;
  }

  public getUserId(): string {
    return this.userId;
  }

  public getFriendId(): string {
    return this.friendId;
  }

  public getStatus(): 'pendiente' | 'aceptada' | 'rechazada' {
    return this.status;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getAcceptedAt(): Date | undefined {
    return this.acceptedAt;
  }

  public getIsDeleted(): boolean {
    return this.isDeleted;
  }

  public isPending(): boolean {
    return this.status === FRIENDSHIP_STATUS.PENDING;
  }

  public isAccepted(): boolean {
    return this.status === FRIENDSHIP_STATUS.ACCEPTED;
  }

  public isRejected(): boolean {
    return this.status === FRIENDSHIP_STATUS.REJECTED;
  }

  public toData(): FriendshipData {
    return {
      id: this.id,
      userId: this.userId,
      friendId: this.friendId,
      status: this.status,
      createdAt: this.createdAt,
      acceptedAt: this.acceptedAt,
      isDeleted: this.isDeleted
    };
  }

  public toPublicData(): FriendshipData {
    return {
      id: this.id,
      userId: this.userId,
      friendId: this.friendId,
      status: this.status,
      createdAt: this.createdAt,
      acceptedAt: this.acceptedAt,
      isDeleted: this.isDeleted
    };
  }
}