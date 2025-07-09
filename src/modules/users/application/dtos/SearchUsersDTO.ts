// DTO para búsqueda de usuarios
export interface SearchUsersDTO {
  query: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// DTO para filtros avanzados de búsqueda
export interface SearchUsersFiltersDTO {
  query: string;
  verified?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}