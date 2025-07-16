// src/modules/trips/infrastructure/repositories/TripMongoRepository.ts
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { Trip, TripStatus, TripCategory } from '../../domain/Trip';
import { ITripRepository, ITripFilters } from '../../domain/interfaces/ITripRepository';
import { DatabaseConnection } from '../../../../shared/database/DatabaseConnection';

export class TripMongoRepository implements ITripRepository {
  private collection: Collection;

  constructor() {
    const db = DatabaseConnection.getDatabase();
    this.collection = db.collection('trips');
  }

  // Operaciones básicas CRUD
  public async create(trip: Trip): Promise<void> {
    const document = this.tripToDocument(trip);
    await this.collection.insertOne(document);
  }

  public async findById(id: string): Promise<Trip | null> {
    const document = await this.collection.findOne({ 
      _id: new ObjectId(id),
      isDeleted: false 
    });
    return document ? this.documentToTrip(document) : null;
  }

  public async update(trip: Trip): Promise<void> {
    const document = this.tripToDocument(trip);
    await this.collection.updateOne(
      { _id: new ObjectId(trip.id) },
      { $set: document }
    );
  }

  public async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: new ObjectId(id) });
  }

  public async softDelete(id: string): Promise<void> {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isDeleted: true, 
          isActive: false, 
          updatedAt: new Date() 
        } 
      }
    );
  }

  // Consultas específicas
  public async findByUserId(userId: string, filters?: ITripFilters): Promise<Trip[]> {
    const query: any = { 
      userId, 
      isDeleted: false 
    };

    if (filters?.status) query.status = filters.status;
    if (filters?.category) query.category = filters.category;
    if (filters?.isGroupTrip !== undefined) query.isGroupTrip = filters.isGroupTrip;
    if (filters?.destination) {
      query.destination = { $regex: filters.destination, $options: 'i' };
    }
    if (filters?.startDate || filters?.endDate) {
      query.startDate = {};
      if (filters.startDate) query.startDate.$gte = filters.startDate;
      if (filters.endDate) query.startDate.$lte = filters.endDate;
    }

    const cursor = this.collection.find(query)
      .sort({ createdAt: -1 });

    if (filters?.limit) cursor.limit(filters.limit);
    if (filters?.offset) cursor.skip(filters.offset);

    const documents = await cursor.toArray();
    return documents.map(doc => this.documentToTrip(doc));
  }

  public async findActiveByUserId(userId: string): Promise<Trip[]> {
    const documents = await this.collection.find({
      userId,
      isActive: true,
      isDeleted: false,
      status: { $in: [TripStatus.ACTIVE, TripStatus.DRAFT] }
    }).sort({ startDate: 1 }).toArray();

    return documents.map(doc => this.documentToTrip(doc));
  }

  public async findByDestination(destination: string, userId?: string): Promise<Trip[]> {
    const query: any = {
      destination: { $regex: destination, $options: 'i' },
      isDeleted: false
    };

    if (userId) query.userId = userId;

    const documents = await this.collection.find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return documents.map(doc => this.documentToTrip(doc));
  }

  public async findByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<Trip[]> {
    const query: any = {
      isDeleted: false,
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
      ]
    };

    if (userId) query.userId = userId;

    const documents = await this.collection.find(query)
      .sort({ startDate: 1 })
      .toArray();

    return documents.map(doc => this.documentToTrip(doc));
  }

  public async findByCategory(category: string, userId?: string): Promise<Trip[]> {
    const query: any = {
      category,
      isDeleted: false
    };

    if (userId) query.userId = userId;

    const documents = await this.collection.find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return documents.map(doc => this.documentToTrip(doc));
  }

  public async findGroupTrips(userId: string): Promise<Trip[]> {
    const documents = await this.collection.find({
      userId,
      isGroupTrip: true,
      isDeleted: false
    }).sort({ createdAt: -1 }).toArray();

    return documents.map(doc => this.documentToTrip(doc));
  }

  // Operaciones de búsqueda y filtrado
  public async search(query: string, userId?: string): Promise<Trip[]> {
    const searchQuery: any = {
      isDeleted: false,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { destination: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    };

    if (userId) searchQuery.userId = userId;

    const documents = await this.collection.find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return documents.map(doc => this.documentToTrip(doc));
  }

  public async findWithFilters(filters: ITripFilters): Promise<Trip[]> {
    const query: any = { isDeleted: false };

    if (filters.userId) query.userId = filters.userId;
    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    if (filters.isGroupTrip !== undefined) query.isGroupTrip = filters.isGroupTrip;
    if (filters.destination) {
      query.destination = { $regex: filters.destination, $options: 'i' };
    }
    if (filters.startDate || filters.endDate) {
      query.startDate = {};
      if (filters.startDate) query.startDate.$gte = filters.startDate;
      if (filters.endDate) query.startDate.$lte = filters.endDate;
    }
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const cursor = this.collection.find(query)
      .sort({ createdAt: -1 });

    if (filters.limit) cursor.limit(filters.limit);
    if (filters.offset) cursor.skip(filters.offset);

    const documents = await cursor.toArray();
    return documents.map(doc => this.documentToTrip(doc));
  }

  public async countByFilters(filters: ITripFilters): Promise<number> {
    const query: any = { isDeleted: false };

    if (filters.userId) query.userId = filters.userId;
    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    if (filters.isGroupTrip !== undefined) query.isGroupTrip = filters.isGroupTrip;
    if (filters.destination) {
      query.destination = { $regex: filters.destination, $options: 'i' };
    }
    if (filters.startDate || filters.endDate) {
      query.startDate = {};
      if (filters.startDate) query.startDate.$gte = filters.startDate;
      if (filters.endDate) query.startDate.$lte = filters.endDate;
    }
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    return await this.collection.countDocuments(query);
  }

  // Validaciones
  public async existsById(id: string): Promise<boolean> {
    const count = await this.collection.countDocuments({ 
      _id: new ObjectId(id),
      isDeleted: false 
    });
    return count > 0;
  }

  public async isOwner(tripId: string, userId: string): Promise<boolean> {
    const count = await this.collection.countDocuments({
      _id: new ObjectId(tripId),
      userId,
      isDeleted: false
    });
    return count > 0;
  }

  // Operaciones de agregación
  public async getUserTripStats(userId: string): Promise<{
    totalTrips: number;
    completedTrips: number;
    activeTrips: number;
    totalExpenses: number;
    averageTripDuration: number;
  }> {
    const pipeline = [
      {
        $match: {
          userId,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          completedTrips: {
            $sum: { $cond: [{ $eq: ['$status', TripStatus.COMPLETED] }, 1, 0] }
          },
          activeTrips: {
            $sum: { $cond: [{ $eq: ['$status', TripStatus.ACTIVE] }, 1, 0] }
          },
          totalExpenses: { $sum: '$actualExpense' },
          totalDuration: {
            $sum: {
              $divide: [
                { $subtract: ['$endDate', '$startDate'] },
                24 * 60 * 60 * 1000 // Convert to days
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalTrips: 1,
          completedTrips: 1,
          activeTrips: 1,
          totalExpenses: 1,
          averageTripDuration: {
            $cond: [
              { $gt: ['$totalTrips', 0] },
              { $divide: ['$totalDuration', '$totalTrips'] },
              0
            ]
          }
        }
      }
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    
    if (result.length === 0) {
      return {
        totalTrips: 0,
        completedTrips: 0,
        activeTrips: 0,
        totalExpenses: 0,
        averageTripDuration: 0
      };
    }

    return result[0];
  }

  // Métodos auxiliares de conversión
  private tripToDocument(trip: Trip): any {
    return {
      _id: new ObjectId(trip.id),
      userId: trip.userId,
      title: trip.title,
      destination: trip.destination,
      description: trip.description,
      startDate: trip.startDate,
      endDate: trip.endDate,
      estimatedBudget: trip.estimatedBudget,
      actualExpense: trip.actualExpense,
      baseCurrency: trip.baseCurrency,
      isActive: trip.isActive,
      isGroupTrip: trip.isGroupTrip,
      category: trip.category,
      image: trip.image,
      planningProgress: trip.planningProgress,
      status: trip.status,
      isDeleted: trip.isDeleted,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt
    };
  }

  private documentToTrip(document: any): Trip {
    const trip = new Trip({
      userId: document.userId,
      title: document.title,
      destination: document.destination,
      description: document.description,
      startDate: document.startDate,
      endDate: document.endDate,
      estimatedBudget: document.estimatedBudget,
      baseCurrency: document.baseCurrency,
      isGroupTrip: document.isGroupTrip,
      category: document.category,
      image: document.image
    });

    // Establecer propiedades que no se pasan en el constructor
    trip._id = document._id;
    trip.actualExpense = document.actualExpense || 0;
    trip.isActive = document.isActive;
    trip.planningProgress = document.planningProgress || 0;
    trip.status = document.status;
    trip.isDeleted = document.isDeleted || false;
    trip.createdAt = document.createdAt;
    trip.updatedAt = document.updatedAt;

    return trip;
  }
}