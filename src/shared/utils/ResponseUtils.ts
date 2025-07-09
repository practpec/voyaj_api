import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: Date;
  requestId?: string;
  pagination?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
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
}

export class ResponseUtils {
  // Respuesta de éxito genérica
  public static success<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      timestamp: new Date(),
      requestId: res.locals.requestId
    };

    if (data !== undefined) {
      response.data = data;
    }

    if (message !== undefined) {
      response.message = message;
    }

    return res.status(statusCode).json(response);
  }

  // Respuesta de éxito con paginación
  public static successWithPagination<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    message?: string
  ): Response {
    const response: ApiResponse<T[]> = {
      success: true,
      data,
      pagination,
      timestamp: new Date(),
      requestId: res.locals.requestId
    };

    if (message !== undefined) {
      response.message = message;
    }

    return res.status(200).json(response);
  }

  // Respuesta de creación exitosa
  public static created<T>(
    res: Response,
    data?: T,
    message: string = 'Recurso creado exitosamente'
  ): Response {
    return this.success(res, data, message, 201);
  }

  // Respuesta de actualización exitosa
  public static updated<T>(
    res: Response,
    data?: T,
    message: string = 'Recurso actualizado exitosamente'
  ): Response {
    return this.success(res, data, message, 200);
  }

  // Respuesta de eliminación exitosa
  public static deleted(
    res: Response,
    message: string = 'Recurso eliminado exitosamente'
  ): Response {
    return this.success(res, undefined, message, 200);
  }

  // Respuesta sin contenido
  public static noContent(res: Response): Response {
    return res.status(204).send();
  }

  // Respuesta de error
  public static error(
    res: Response,
    statusCode: number,
    errorCode: string,
    message: string,
    details?: any
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      timestamp: new Date(),
      requestId: res.locals.requestId,
      error: {
        code: errorCode,
        message,
        details: process.env.NODE_ENV === 'development' ? details : undefined
      }
    };

    return res.status(statusCode).json(response);
  }

  // Respuesta de validación fallida
  public static validationError(
    res: Response,
    message: string,
    details?: any
  ): Response {
    return this.error(res, 400, 'VALIDATION_ERROR', message, details);
  }

  // Respuesta de no autorizado
  public static unauthorized(
    res: Response,
    message: string = 'No autorizado'
  ): Response {
    return this.error(res, 401, 'UNAUTHORIZED', message);
  }

  // Respuesta de prohibido
  public static forbidden(
    res: Response,
    message: string = 'Acceso prohibido'
  ): Response {
    return this.error(res, 403, 'FORBIDDEN', message);
  }

  // Respuesta de no encontrado
  public static notFound(
    res: Response,
    message: string = 'Recurso no encontrado'
  ): Response {
    return this.error(res, 404, 'NOT_FOUND', message);
  }

  // Respuesta de conflicto
  public static conflict(
    res: Response,
    message: string = 'Conflicto de recursos'
  ): Response {
    return this.error(res, 409, 'CONFLICT', message);
  }

  // Respuesta de rate limit
  public static rateLimitExceeded(
    res: Response,
    message: string = 'Demasiadas peticiones'
  ): Response {
    return this.error(res, 429, 'RATE_LIMIT_EXCEEDED', message);
  }

  // Respuesta de error interno del servidor
  public static internalServerError(
    res: Response,
    message: string = 'Error interno del servidor',
    details?: any
  ): Response {
    return this.error(res, 500, 'INTERNAL_SERVER_ERROR', message, details);
  }

  // Respuesta de login exitoso
  public static loginSuccess(
    res: Response,
    user: any,
    tokens: { accessToken: string; refreshToken: string }
  ): Response {
    return this.success(res, {
      user,
      tokens
    }, 'Inicio de sesión exitoso');
  }

  // Respuesta de logout exitoso
  public static logoutSuccess(res: Response): Response {
    return this.success(res, undefined, 'Cierre de sesión exitoso');
  }

  // Respuesta de registro exitoso
  public static registerSuccess(
    res: Response,
    user: any,
    tokens: { accessToken: string; refreshToken: string }
  ): Response {
    return this.created(res, {
      user,
      tokens
    }, 'Usuario registrado exitosamente');
  }

  // Respuesta de token renovado
  public static tokenRefreshed(
    res: Response,
    tokens: { accessToken: string; refreshToken: string }
  ): Response {
    return this.success(res, { tokens }, 'Token renovado exitosamente');
  }

  // Respuesta de verificación de email
  public static emailVerified(res: Response): Response {
    return this.success(res, undefined, 'Email verificado exitosamente');
  }

  // Respuesta de código de verificación enviado
  public static verificationCodeSent(res: Response): Response {
    return this.success(res, undefined, 'Código de verificación enviado');
  }

  // Respuesta de contraseña cambiada
  public static passwordChanged(res: Response): Response {
    return this.success(res, undefined, 'Contraseña cambiada exitosamente');
  }

  // Respuesta de perfil actualizado
  public static profileUpdated(res: Response, user: any): Response {
    return this.updated(res, user, 'Perfil actualizado exitosamente');
  }

  // Respuesta de cuenta eliminada
  public static accountDeleted(res: Response): Response {
    return this.deleted(res, 'Cuenta eliminada exitosamente');
  }

  // Respuesta de búsqueda
  public static searchResults<T>(
    res: Response,
    results: T[],
    pagination: PaginationMeta,
    query: string
  ): Response {
    return this.successWithPagination(
      res,
      results,
      pagination,
      `Resultados de búsqueda para: "${query}"`
    );
  }

  // Respuesta de health check
  public static healthCheck(
    res: Response,
    status: any
  ): Response {
    return this.success(res, status, 'Sistema operativo');
  }

  // Respuesta de información de API
  public static apiInfo(
    res: Response,
    info: any
  ): Response {
    return this.success(res, info, 'Información de la API');
  }
}