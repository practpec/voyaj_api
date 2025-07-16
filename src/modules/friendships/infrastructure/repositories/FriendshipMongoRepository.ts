// src/modules/friendships/infrastructure/repositories/FriendshipMongoRepository.ts
import { Collection } from 'mongodb';
import { Friendship, FriendshipData } from '../../domain/Friendship';
import { IFriendshipRepository } from '../../domain/interfaces/IFriendshipRepository';
import { DatabaseConnection } from '../../../../shared/database/Connection';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { FRIENDSHIP_STATUS } from '../../../../shared/constants';

export class FriendshipMongoRepository implements IFriendshipRepository {
  private collection: Collection<FriendshipData>;
  private logger: LoggerService;

  constructor() {
    const db = DatabaseConnection.getInstance().getDatabase();
    this.collection = db.collection<FriendshipData>('friendships');
    this.logger = LoggerService.getInstance();
    
    this.createIndexes();
  }
  countPendingRequestsByRecipient(userId: string): Promise<number> {
    throw new Error('Method not implemented.');
  }
  countPendingRequestsBySender(userId: string): Promise<number> {
    throw new Error('Method not implemented.');
  }

  private async createIndexes(): Promise<void> {
    try {
      await Promise.all([
        this.collection.createIndex({ userId: 1, friendId: 1 }, { background: true, unique: true }),
        this.collection.createIndex({ userId: 1, status: 1, isDeleted: 1 }, { background: true }),
        this.collection.createIndex({ friendId: 1, status: 1, isDeleted: 1 }, { background: true }),
        this.collection.createIndex({ status: 1, isDeleted: 1 }, { background: true }),
        this.collection.createIndex({ createdAt: 1 }, { background: true })
      ]);
      
      this.logger.info('Índices de friendships creados exitosamente');
    } catch (error) {
      this.logger.error('Error creando índices de friendships:', error);
    }
  }

  public async create(friendship: Friendship): Promise<void> {
    try {
      const friendshipData = friendship.toData();
      await this.collection.insertOne(friendshipData);
      
      this.logger.logDatabase('INSERT', 'friendships');
    } catch (error) {
      this.logger.logDatabase('INSERT', 'friendships', undefined, error);
      throw ErrorHandler.createDatabaseError('Error creando amistad', error);
    }
  }

  public async update(friendship: Friendship): Promise<void> {
    try {
      const friendshipData = friendship.toData();
      await this.collection.updateOne(
        { id: friendship.getId() },
        { $set: friendshipData }
      );
      
      this.logger.logDatabase('UPDATE', 'friendships');
    } catch (error) {
      this.logger.logDatabase('UPDATE', 'friendships', undefined, error);
      throw ErrorHandler.createDatabaseError('Error actualizando amistad', error);
    }
  }

  public async findById(id: string): Promise<Friendship | null> {
    try {
      const startTime = Date.now();
      const friendshipData = await this.collection.findOne({ id, isDeleted: false });
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_BY_ID', 'friendships', duration);
      
      return friendshipData ? Friendship.fromData(friendshipData) : null;
    } catch (error) {
      this.logger.logDatabase('FIND_BY_ID', 'friendships', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando amistad por ID', error);
    }
  }

  public async findByUsers(userId: string, friendId: string): Promise<Friendship | null> {
    try {
      const startTime = Date.now();
      const friendshipData = await this.collection.findOne({
        $or: [
          { userId, friendId, isDeleted: false },
          { userId: friendId, friendId: userId, isDeleted: false }
        ]
      });
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_BY_USERS', 'friendships', duration);
      
      return friendshipData ? Friendship.fromData(friendshipData) : null;
    } catch (error) {
      this.logger.logDatabase('FIND_BY_USERS', 'friendships', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando amistad entre usuarios', error);
    }
  }

  public async findAcceptedBetweenUsers(userId: string, friendId: string): Promise<Friendship | null> {
    try {
      const startTime = Date.now();
      const friendshipData = await this.collection.findOne({
        $or: [
          { userId, friendId, status: FRIENDSHIP_STATUS.ACCEPTED, isDeleted: false },
          { userId: friendId, friendId: userId, status: FRIENDSHIP_STATUS.ACCEPTED, isDeleted: false }
        ]
      });
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_ACCEPTED', 'friendships', duration);
      
      return friendshipData ? Friendship.fromData(friendshipData) : null;
    } catch (error) {
      this.logger.logDatabase('FIND_ACCEPTED', 'friendships', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando amistad aceptada', error);
    }
  }

  public async findPendingBetweenUsers(userId: string, friendId: string): Promise<Friendship | null> {
    try {
      const startTime = Date.now();
      const friendshipData = await this.collection.findOne({
        $or: [
          { userId, friendId, status: FRIENDSHIP_STATUS.PENDING, isDeleted: false },
          { userId: friendId, friendId: userId, status: FRIENDSHIP_STATUS.PENDING, isDeleted: false }
        ]
      });
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_PENDING', 'friendships', duration);
      
      return friendshipData ? Friendship.fromData(friendshipData) : null;
    } catch (error) {
      this.logger.logDatabase('FIND_PENDING', 'friendships', undefined, error);
      throw ErrorHandler.createDatabaseError('Error buscando solicitud pendiente', error);
    }
  }

  public async findFriendsByUserId(userId: string): Promise<Friendship[]> {
    try {
      const startTime = Date.now();
      const friendshipsData = await this.collection.find({
        $or: [
          { userId, status: FRIENDSHIP_STATUS.ACCEPTED, isDeleted: false },
          { friendId: userId, status: FRIENDSHIP_STATUS.ACCEPTED, isDeleted: false }
        ]
      }).toArray();
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_FRIENDS', 'friendships', duration);
      
      return friendshipsData.map(data => Friendship.fromData(data));
    } catch (error) {
      this.logger.logDatabase('FIND_FRIENDS', 'friendships', undefined, error);
      throw ErrorHandler.createDatabaseError('Error obteniendo amigos del usuario', error);
    }
  }

  public async findPendingRequestsByRecipient(recipientId: string): Promise<Friendship[]> {
    try {
      const startTime = Date.now();
      const requestsData = await this.collection.find({
        friendId: recipientId,
        status: FRIENDSHIP_STATUS.PENDING,
        isDeleted: false
      }).sort({ createdAt: -1 }).toArray();
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_PENDING_RECEIVED', 'friendships', duration);
      
      return requestsData.map(data => Friendship.fromData(data));
    } catch (error) {
      this.logger.logDatabase('FIND_PENDING_RECEIVED', 'friendships', undefined, error);
      throw ErrorHandler.createDatabaseError('Error obteniendo solicitudes recibidas', error);
    }
  }

  public async findPendingRequestsBySender(senderId: string): Promise<Friendship[]> {
    try {
      const startTime = Date.now();
      const requestsData = await this.collection.find({
        userId: senderId,
        status: FRIENDSHIP_STATUS.PENDING,
        isDeleted: false
      }).sort({ createdAt: -1 }).toArray();
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('FIND_PENDING_SENT', 'friendships', duration);
      
      return requestsData.map(data => Friendship.fromData(data));
    } catch (error) {
      this.logger.logDatabase('FIND_PENDING_SENT', 'friendships', undefined, error);
      throw ErrorHandler.createDatabaseError('Error obteniendo solicitudes enviadas', error);
    }
  }

  public async findSuggestedFriends(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const startTime = Date.now();
      
      // Obtener IDs de amigos actuales y solicitudes existentes
      const [currentFriends, sentRequests, receivedRequests] = await Promise.all([
        this.collection.distinct('friendId', { 
          userId, 
          status: FRIENDSHIP_STATUS.ACCEPTED, 
          isDeleted: false 
        }),
        this.collection.distinct('friendId', { 
          userId, 
          status: FRIENDSHIP_STATUS.PENDING, 
          isDeleted: false 
        }),
        this.collection.distinct('userId', { 
          friendId: userId, 
          status: FRIENDSHIP_STATUS.PENDING, 
          isDeleted: false 
        })
      ]);

      // Combinar todos los IDs a excluir
      const excludeIds = [
        userId,
        ...currentFriends,
        ...sentRequests,
        ...receivedRequests
      ];

      // Por ahora, devolvemos sugerencias básicas
      // En una implementación real, aquí iría lógica más compleja
      const suggestions = [
        { userId: 'suggestion-1', reason: 'mutual_friends' },
        { userId: 'suggestion-2', reason: 'new_users' }
      ].filter(s => !excludeIds.includes(s.userId))
       .slice(0, limit);

      const duration = Date.now() - startTime;
      this.logger.logDatabase('FIND_SUGGESTIONS', 'friendships', duration);
      
      return suggestions;
    } catch (error) {
      this.logger.logDatabase('FIND_SUGGESTIONS', 'friendships', undefined, error);
      throw ErrorHandler.createDatabaseError('Error obteniendo sugerencias de amigos', error);
    }
  }

  public async countFriendsByUserId(userId: string): Promise<number> {
    try {
      const startTime = Date.now();
      const count = await this.collection.countDocuments({
        $or: [
          { userId, status: FRIENDSHIP_STATUS.ACCEPTED, isDeleted: false },
          { friendId: userId, status: FRIENDSHIP_STATUS.ACCEPTED, isDeleted: false }
        ]
      });
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase('COUNT_FRIENDS', 'friendships', duration);
      
      return count;
    } catch (error) {
      this.logger.logDatabase('COUNT_FRIENDS', 'friendships', undefined, error);
      throw ErrorHandler.createDatabaseError('Error contando amigos del usuario', error);
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      await this.collection.updateOne(
        { id },
        { $set: { isDeleted: true } }
      );
      
      this.logger.logDatabase('DELETE', 'friendships');
    } catch (error) {
      this.logger.logDatabase('DELETE', 'friendships', undefined, error);
      throw ErrorHandler.createDatabaseError('Error eliminando amistad', error);
    }
  }
  // Esta función cuenta las solicitudes de amistad rechazadas por un usuario
public async countRejectedRequestsByUserId(userId: string): Promise<number> {
  try {
    const startTime = Date.now();
    const count = await this.collection.countDocuments({
      status: FRIENDSHIP_STATUS.REJECTED,
      isDeleted: false,
      $or: [
        { userId },
        { friendId: userId }
      ]
    });
    const duration = Date.now() - startTime;

    this.logger.logDatabase('COUNT_REJECTED', 'friendships', duration);

    return count;
  } catch (error) {
    this.logger.logDatabase('COUNT_REJECTED', 'friendships', undefined, error);
    throw ErrorHandler.createDatabaseError('Error contando solicitudes rechazadas', error);
  }
}


}