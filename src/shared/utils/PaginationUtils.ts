// src/shared/utils/PaginationUtils.ts
import { APP_LIMITS } from '../constants';

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage?: number;
  previousPage?: number;
  startIndex: number;
  endIndex: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export class PaginationUtils {
  // Crear opciones de paginación desde query parameters
  public static createPaginationOptions(query: any): PaginationOptions {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(
      APP_LIMITS.PAGINATION_MAX_LIMIT,
      Math.max(1, parseInt(query.limit) || APP_LIMITS.PAGINATION_DEFAULT_LIMIT)
    );
    
    const sortBy = query.sortBy || 'creado_en';
    const sortOrder: 'asc' | 'desc' = query.sortOrder === 'asc' ? 'asc' : 'desc';

    return { page, limit, sortBy, sortOrder };
  }

  // Crear metadata de paginación
  public static createPaginationMeta(
    page: number,
    limit: number,
    totalItems: number
  ): PaginationMeta {
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    const startIndex = (page - 1) * limit + 1;
    const endIndex = Math.min(page * limit, totalItems);

    return {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      nextPage: hasNextPage ? page + 1 : undefined,
      previousPage: hasPreviousPage ? page - 1 : undefined,
      startIndex: totalItems > 0 ? startIndex : 0,
      endIndex: totalItems > 0 ? endIndex : 0
    };
  }

  // Crear resultado paginado
  public static createPaginatedResult<T>(
    data: T[],
    page: number,
    limit: number,
    totalItems: number
  ): PaginatedResult<T> {
    const pagination = this.createPaginationMeta(page, limit, totalItems);
    
    return {
      data,
      pagination
    };
  }

  // Calcular skip para MongoDB
  public static calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  // Validar parámetros de paginación
  public static validatePaginationParams(page: number, limit: number): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (page < 1) {
      errors.push('El número de página debe ser mayor a 0');
    }

    if (limit < 1) {
      errors.push('El límite debe ser mayor a 0');
    }

    if (limit > APP_LIMITS.PAGINATION_MAX_LIMIT) {
      errors.push(`El límite no puede ser mayor a ${APP_LIMITS.PAGINATION_MAX_LIMIT}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Generar query de ordenamiento para MongoDB
  public static createSortQuery(sortBy: string, sortOrder: 'asc' | 'desc'): Record<string, 1 | -1> {
    // Campos permitidos para ordenamiento
    const allowedSortFields = [
      'creado_en',
      'modificado_en',
      'nombre',
      'correo_electronico',
      'fecha_inicio',
      'fecha_fin',
      'titulo'
    ];

    // Usar campo por defecto si no está permitido
    const field = allowedSortFields.includes(sortBy) ? sortBy : 'creado_en';
    const order = sortOrder === 'asc' ? 1 : -1;

    return { [field]: order };
  }

  // Paginación basada en cursor (para mejor performance en grandes datasets)
  public static createCursorPagination(
    lastId?: string,
    limit: number = APP_LIMITS.PAGINATION_DEFAULT_LIMIT
  ): {
    query: any;
    limit: number;
  } {
    const query: any = {};
    
    if (lastId) {
      query._id = { $gt: lastId };
    }

    return {
      query,
      limit: Math.min(limit, APP_LIMITS.PAGINATION_MAX_LIMIT)
    };
  }

  // Crear metadata para paginación por cursor
  public static createCursorMeta<T extends { _id?: string }>(
    data: T[],
    limit: number,
    hasMore: boolean
  ): {
    hasMore: boolean;
    nextCursor?: string;
    count: number;
  } {
    const count = data.length;
    const lastItem = count > 0 ? data[count - 1] : undefined;
    const nextCursor = hasMore && lastItem && lastItem._id ? lastItem._id : undefined;

    return {
      hasMore,
      nextCursor,
      count
    };
  }

  // Generar enlaces de navegación
  public static createNavigationLinks(
    baseUrl: string,
    pagination: PaginationMeta,
    queryParams: Record<string, any> = {}
  ): {
    first?: string;
    previous?: string;
    next?: string;
    last?: string;
  } {
    const createUrl = (page: number): string => {
      const params = new URLSearchParams({
        ...queryParams,
        page: page.toString(),
        limit: pagination.limit.toString()
      });
      return `${baseUrl}?${params.toString()}`;
    };

    const links: any = {};

    // Primera página
    if (pagination.page > 1) {
      links.first = createUrl(1);
    }

    // Página anterior
    if (pagination.hasPreviousPage) {
      links.previous = createUrl(pagination.previousPage!);
    }

    // Página siguiente
    if (pagination.hasNextPage) {
      links.next = createUrl(pagination.nextPage!);
    }

    // Última página
    if (pagination.page < pagination.totalPages) {
      links.last = createUrl(pagination.totalPages);
    }

    return links;
  }

  // Optimización para consultas grandes
  public static optimizeForLargeDataset(
    page: number,
    limit: number,
    totalItems: number
  ): {
    useOffsetLimit: boolean;
    useCursor: boolean;
    recommendation: string;
  } {
    const skip = this.calculateSkip(page, limit);
    const threshold = 10000; // Umbral para considerar usar cursor

    if (skip > threshold) {
      return {
        useOffsetLimit: false,
        useCursor: true,
        recommendation: 'Usar paginación por cursor para mejor performance'
      };
    }

    return {
      useOffsetLimit: true,
      useCursor: false,
      recommendation: 'Paginación offset/limit es eficiente para este caso'
    };
  }

  // Calcular rango de páginas para UI
  public static calculatePageRange(
    currentPage: number,
    totalPages: number,
    maxVisible: number = 5
  ): number[] {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);

    // Ajustar si estamos cerca del final
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
}