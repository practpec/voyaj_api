// Interfaz del repositorio de amistades
import { Friendship } from '../Friendship';

export interface IFriendshipRepository {
  create(friendship: Friendship): Promise<void>;
  update(friendship: Friendship): Promise<void>;
  findById(id: string): Promise<Friendship | null>;
  findByUsers(userId: string, friendId: string): Promise<Friendship | null>;
  findAcceptedBetweenUsers(userId: string, friendId: string): Promise<Friendship | null>;
  findPendingBetweenUsers(userId: string, friendId: string): Promise<Friendship | null>;
  findFriendsByUserId(userId: string): Promise<Friendship[]>;
  findPendingRequestsByRecipient(recipientId: string): Promise<Friendship[]>;
  findPendingRequestsBySender(senderId: string): Promise<Friendship[]>;
  findSuggestedFriends(userId: string, limit?: number): Promise<any[]>;
  countFriendsByUserId(userId: string): Promise<number>;
  countPendingRequestsByRecipient(userId: string): Promise<number>;
  countPendingRequestsBySender(userId: string): Promise<number>;
  countRejectedRequestsByUserId(userId: string): Promise<number>; // ← añadido
  delete(id: string): Promise<void>;
}
