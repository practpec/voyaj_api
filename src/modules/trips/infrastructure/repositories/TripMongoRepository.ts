// src/modules/trips/infrastructure/repositories/TripMemberMongoRepository.ts
import { Collection, ObjectId } from 'mongodb';
import { TripMember, TripMemberRole, TripMemberStatus } from '../../domain/TripMember';
import { ITripMemberRepository, ITripMemberFilters } from '../../domain/interfaces/ITripMemberRepository';
import { DatabaseConnection } from '../../../../shared/database/DatabaseConnection';

export class TripMemberMongoRepository implements ITripMemberRepository {
  private collection: Collection;

  constructor() {
    const db = DatabaseConnection.getDatabase();
    this.collection = db.collection('trip_members');
  }

  // Operaciones básicas CRUD
  public async create(tripMember: TripMember): Promise<void> {
    const document = this.tripMemberToDocument(tripMember);
    await this.collection.insertOne(document);
  }

  public async findById(id: string): Promise<TripMember | null> {
    const document = await this.collection.findOne({ _id: new ObjectId(id) });
    return document ? this.documentToTripMember(document) : null;
  }

  public async update(tripMember: TripMember): Promise<void> {
    const document = this.tripMemberToDocument(tripMember);
    await this.collection.updateOne(
      { _id: new ObjectId(tripMember.id) },
      { $set: document }
    );
  }

  public async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: new ObjectId(id) });
  }

  // Consultas específicas por viaje
  public async findByTripId(tripId: string, filters?: ITripMemberFilters): Promise<TripMember[]> {
    const query: any = { tripId };

    if (filters?.role) query.role = filters.role;
    if (filters?.status) query.status = filters.status;
    if (filters?.isActive !== undefined) query.isActive = filters.isActive;

    const cursor = this.collection.find(query).sort({ createdAt: 1 });

    if (filters?.limit) cursor.limit(filters.limit);
    if (filters?.offset) cursor.skip(filters.offset);

    const documents = await cursor.toArray();
    return documents.map(doc => this.documentToTripMember(doc));
  }

  public async findActiveMembersByTripId(tripId: string): Promise<TripMember[]> {
    const documents = await this.collection.find({
      tripId,
      isActive: true,
      status: TripMemberStatus.ACCEPTED
    }).sort({ createdAt: 1 }).toArray();

    return documents.map(doc => this.documentToTripMember(doc));
  }

  public async findPendingMembersByTripId(tripId: string): Promise<TripMember[]> {
    const documents = await this.collection.find({
      tripId,
      status: TripMemberStatus.PENDING
    }).sort({ invitedAt: -1 }).toArray();

    return documents.map(doc => this.documentToTripMember(doc));
  }

  public async findTripOwner(tripId: string): Promise<TripMember | null> {
    const document = await this.collection.findOne({
      tripId,
      role: TripMemberRole.OWNER,
      isActive: true
    });

    return document ? this.documentToTripMember(document) : null;
  }

  public async findTripAdmins(tripId: string): Promise<TripMember[]> {
    const documents = await this.collection.find({
      tripId,
      role: TripMemberRole.ADMIN,
      isActive: true,
      status: TripMemberStatus.ACCEPTED
    }).sort({ createdAt: 1 }).toArray();

    return documents.map(doc => this.documentToTripMember(doc));
  }

  // Consultas específicas por usuario
  public async findByUserId(userId: string, filters?: ITripMemberFilters): Promise<TripMember[]> {
    const query: any = { userId };

    if (filters?.role) query.role = filters.role;
    if (filters?.status) query.status = filters.status;
    if (filters?.isActive !== undefined) query.isActive = filters.isActive;

    const cursor = this.collection.find(query).sort({ createdAt: -1 });

    if (filters?.limit) cursor.limit(filters.limit);
    if (filters?.offset) cursor.skip(filters.offset);

    const documents = await cursor.toArray();
    return documents.map(doc => this.documentToTripMember(doc));
  }

  public async findActiveByUserId(userId: string): Promise<TripMember[]> {
    const documents = await this.collection.find({
      userId,
      isActive: true,
      status: TripMemberStatus.ACCEPTED
    }).sort({ createdAt: -1 }).toArray();

    return documents.map(doc => this.documentToTripMember(doc));
  }

  public async findPendingInvitationsByUserId(userId: string): Promise<TripMember[]> {
    const documents = await this.collection.find({
      userId,
      status: TripMemberStatus.PENDING
    }).sort({ invitedAt: -1 }).toArray();

    return documents.map(doc => this.documentToTripMember(doc));
  }

  public async findUserTripsWithRole(userId: string, role: TripMemberRole): Promise<TripMember[]> {
    const documents = await this.collection.find({
      userId,
      role,
      isActive: true,
      status: TripMemberStatus.ACCEPTED
    }).sort({ createdAt: -1 }).toArray();

    return documents.map(doc => this.documentToTripMember(doc));
  }

  // Consultas combinadas
  public async findByTripAndUser(tripId: string, userId: string): Promise<TripMember | null> {
    const document = await this.collection.findOne({ tripId, userId });
    return document ? this.documentToTripMember(document) : null;
  }

  public async findByTripAndRole(tripId: string, role: TripMemberRole): Promise<TripMember[]> {
    const documents = await this.collection.find({
      tripId,
      role,
      isActive: true
    }).sort({ createdAt: 1 }).toArray();

    return documents.map(doc => this.documentToTripMember(doc));
  }

  public async findByTripAndStatus(tripId: string, status: TripMemberStatus): Promise<TripMember[]> {
    const documents = await this.collection.find({
      tripId,
      status
    }).sort({ createdAt: 1 }).toArray();

    return documents.map(doc => this.documentToTripMember(doc));
  }

  // Validaciones
  public async existsByTripAndUser(tripId: string, userId: string): Promise<boolean> {
    const count = await this.collection.countDocuments({ tripId, userId });
    return count > 0;
  }

  public async isUserMemberOfTrip(tripId: string, userId: string): Promise<boolean> {
    const count = await this.collection.countDocuments({
      tripId,
      userId,
      isActive: true,
      status: TripMemberStatus.ACCEPTED
    });
    return count > 0;
  }

  public async isUserOwnerOfTrip(tripId: string, userId: string): Promise<boolean> {
    const count = await this.collection.countDocuments({
      tripId,
      userId,
      role: TripMemberRole.OWNER,
      isActive: true
    });
    return count > 0;
  }

  public async isUserAdminOfTrip(tripId: string, userId: string): Promise<boolean> {
    const count = await this.collection.countDocuments({
      tripId,
      userId,
      role: { $in: [TripMemberRole.OWNER, TripMemberRole.ADMIN] },
      isActive: true,
      status: TripMemberStatus.ACCEPTED
    });
    return count > 0;
  }

  public async canUserAccessTrip(tripId: string, userId: string): Promise<boolean> {
    const count = await this.collection.countDocuments({
      tripId,
      userId,
      status: { $in: [TripMemberStatus.ACCEPTED, TripMemberStatus.PENDING] }
    });
    return count > 0;
  }

  // Operaciones de conteo
  public async countMembersByTripId(tripId: string): Promise<number> {
    return await this.collection.countDocuments({ tripId });
  }

  public async countActiveMembersByTripId(tripId: string): Promise<number> {
    return await this.collection.countDocuments({
      tripId,
      isActive: true,
      status: TripMemberStatus.ACCEPTED
    });
  }

  public async countPendingMembersByTripId(tripId: string): Promise<number> {
    return await this.collection.countDocuments({
      tripId,
      status: TripMemberStatus.PENDING
    });
  }

  public async countTripsByUserId(userId: string): Promise<number> {
    return await this.collection.countDocuments({
      userId,
      isActive: true,
      status: TripMemberStatus.ACCEPTED
    });
  }

  // Operaciones de búsqueda
  public async search(query: string, tripId?: string): Promise<TripMember[]> {
    // Para buscar miembros, necesitaríamos hacer lookup con la colección de usuarios
    // Esta implementación es básica y asume que tenemos userId para buscar
    const searchQuery: any = {
      isActive: true,
      status: TripMemberStatus.ACCEPTED
    };

    if (tripId) searchQuery.tripId = tripId;

    const documents = await this.collection.find(searchQuery)
      .limit(20)
      .toArray();

    return documents.map(doc => this.documentToTripMember(doc));
  }

  public async findWithFilters(filters: ITripMemberFilters): Promise<TripMember[]> {
    const query: any = {};

    if (filters.tripId) query.tripId = filters.tripId;
    if (filters.userId) query.userId = filters.userId;
    if (filters.role) query.role = filters.role;
    if (filters.status) query.status = filters.status;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const cursor = this.collection.find(query).sort({ createdAt: 1 });

    if (filters.limit) cursor.limit(filters.limit);
    if (filters.offset) cursor.skip(filters.offset);

    const documents = await cursor.toArray();
    return documents.map(doc => this.documentToTripMember(doc));
  }

  public async countByFilters(filters: ITripMemberFilters): Promise<number> {
    const query: any = {};

    if (filters.tripId) query.tripId = filters.tripId;
    if (filters.userId) query.userId = filters.userId;
    if (filters.role) query.role = filters.role;
    if (filters.status) query.status = filters.status;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    return await this.collection.countDocuments(query);
  }

  // Operaciones de limpieza
  public async deleteByTripId(tripId: string): Promise<void> {
    await this.collection.deleteMany({ tripId });
  }

  public async deleteByUserId(userId: string): Promise<void> {
    await this.collection.deleteMany({ userId });
  }

  public async cleanupRejectedInvitations(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.collection.deleteMany({
      status: TripMemberStatus.REJECTED,
      rejectedAt: { $lt: cutoffDate }
    });

    return result.deletedCount || 0;
  }

  // Métodos auxiliares de conversión
  private tripMemberToDocument(tripMember: TripMember): any {
    return {
      _id: new ObjectId(tripMember.id),
      tripId: tripMember.tripId,
      userId: tripMember.userId,
      role: tripMember.role,
      status: tripMember.status,
      permissions: tripMember.permissions,
      invitedBy: tripMember.invitedBy,
      invitedAt: tripMember.invitedAt,
      acceptedAt: tripMember.acceptedAt,
      rejectedAt: tripMember.rejectedAt,
      leftAt: tripMember.leftAt,
      notes: tripMember.notes,
      isActive: tripMember.isActive,
      createdAt: tripMember.createdAt,
      updatedAt: tripMember.updatedAt
    };
  }

  private documentToTripMember(document: any): TripMember {
    const tripMember = new TripMember({
      tripId: document.tripId,
      userId: document.userId,
      role: document.role,
      invitedBy: document.invitedBy,
      permissions: document.permissions
    });

    // Establecer propiedades que no se pasan en el constructor
    tripMember._id = document._id;
    tripMember.status = document.status;
    tripMember.invitedAt = document.invitedAt;
    tripMember.acceptedAt = document.acceptedAt;
    tripMember.rejectedAt = document.rejectedAt;
    tripMember.leftAt = document.leftAt;
    tripMember.notes = document.notes;
    tripMember.isActive = document.isActive;
    tripMember.createdAt = document.createdAt;
    tripMember.updatedAt = document.updatedAt;

    return tripMember;
  }
}