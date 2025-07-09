import { User } from '../User';
import { PaginatedResult, PaginationOptions } from '../../../../shared/utils/PaginationUtils';

export interface IUserRepository {
  // Operaciones básicas CRUD
  create(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(user: User): Promise<void>;
  delete(id: string): Promise<void>;
  
  // Operaciones de búsqueda
  findMany(options: PaginationOptions): Promise<PaginatedResult<User>>;
  searchByEmailOrName(
    query: string, 
    options: PaginationOptions
  ): Promise<PaginatedResult<User>>;
  
  // Operaciones específicas de autenticación
  findByEmailForAuth(email: string): Promise<User | null>;
  findByRefreshToken(token: string): Promise<User | null>;
  
  // Operaciones de verificación
  findByVerificationCode(
    email: string, 
    code: string, 
    type: 'email' | 'password'
  ): Promise<User | null>;
  
  // Operaciones de administración
  findDeletedUsers(options: PaginationOptions): Promise<PaginatedResult<User>>;
  findBlockedUsers(options: PaginationOptions): Promise<PaginatedResult<User>>;
  
  // Estadísticas
  countTotal(): Promise<number>;
  countActive(): Promise<number>;
  countDeleted(): Promise<number>;
  countVerified(): Promise<number>;
  countBlocked(): Promise<number>;
  
  // Operaciones de limpieza
  cleanExpiredVerificationCodes(): Promise<number>;
  cleanExpiredPasswordResetCodes(): Promise<number>;
  cleanOldDeletedUsers(daysOld: number): Promise<number>;
}