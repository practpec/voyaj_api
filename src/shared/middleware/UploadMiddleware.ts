import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ImageService } from '../services/ImageService';
import { LoggerService } from '../services/LoggerService';
import { ResponseUtils } from '../utils/ResponseUtils';
import { ALLOWED_FILE_TYPES, APP_LIMITS } from '../constants';

// Extender Request para incluir archivos procesados
declare global {
  namespace Express {
    interface Request {
      processedFiles?: {
        [fieldname: string]: {
          url: string;
          publicId: string;
          originalName: string;
          size: number;
        }[];
      };
    }
  }
}

export class UploadMiddleware {
  private static imageService = ImageService.getInstance();
  private static logger = LoggerService.getInstance();

  // Configuración de multer para memoria
  private static storage = multer.memoryStorage();

  // Filtro de archivos
  private static fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Verificar tipo de archivo
    if (ALLOWED_FILE_TYPES.IMAGES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
    }
  };

  // Configuración base de multer
  private static upload = multer({
    storage: this.storage,
    fileFilter: this.fileFilter,
    limits: {
      fileSize: APP_LIMITS.MAX_UPLOAD_SIZE,
      files: 10 // máximo 10 archivos por request
    }
  });

  // Middleware para subir imagen de perfil (single)
  public static uploadProfilePicture = [
    this.upload.single('profilePicture'),
    this.processProfilePicture
  ];

  // Middleware para subir múltiples imágenes de viaje
  public static uploadTripPhotos = [
    this.upload.array('photos', 10),
    this.processTripPhotos
  ];

  // Middleware para subir archivos mixtos
  public static uploadMixed = [
    this.upload.fields([
      { name: 'profilePicture', maxCount: 1 },
      { name: 'photos', maxCount: 10 },
      { name: 'documents', maxCount: 5 }
    ]),
    this.processMixedFiles
  ];

  // Procesar imagen de perfil
  private static processProfilePicture = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.file) {
        next();
        return;
      }

      this.logger.info(`Procesando imagen de perfil: ${req.file.originalname}`);

      // Subir a Cloudinary con transformaciones para perfil
      const result = await this.imageService.uploadProfilePicture(
        req.file.buffer,
        req.file.originalname,
        req.user?.userId
      );

      // Agregar resultado al request
      req.processedFiles = {
        profilePicture: [{
          url: result.url,
          publicId: result.publicId,
          originalName: req.file.originalname,
          size: req.file.size
        }]
      };

      this.logger.info(`Imagen de perfil procesada exitosamente: ${result.publicId}`);
      next();
    } catch (error) {
      this.logger.error('Error procesando imagen de perfil:', error);
      ResponseUtils.error(res, 400, 'UPLOAD_ERROR', 'Error procesando imagen de perfil');
    }
  };

  // Procesar fotos de viaje
  private static processTripPhotos = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        next();
        return;
      }

      this.logger.info(`Procesando ${req.files.length} fotos de viaje`);

      const uploadPromises = req.files.map(async (file) => {
        const result = await this.imageService.uploadTripPhoto(
          file.buffer,
          file.originalname,
          req.user?.userId
        );

        return {
          url: result.url,
          publicId: result.publicId,
          originalName: file.originalname,
          size: file.size
        };
      });

      const results = await Promise.all(uploadPromises);

      // Agregar resultados al request
      req.processedFiles = {
        photos: results
      };

      this.logger.info(`${results.length} fotos de viaje procesadas exitosamente`);
      next();
    } catch (error) {
      this.logger.error('Error procesando fotos de viaje:', error);
      ResponseUtils.error(res, 400, 'UPLOAD_ERROR', 'Error procesando fotos de viaje');
    }
  };

  // Procesar archivos mixtos
  private static processMixedFiles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.files || typeof req.files !== 'object') {
        next();
        return;
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      req.processedFiles = {};

      // Procesar imagen de perfil
      if (files.profilePicture && files.profilePicture.length > 0) {
        const file = files.profilePicture[0];
        const result = await this.imageService.uploadProfilePicture(
          file.buffer,
          file.originalname,
          req.user?.userId
        );

        req.processedFiles.profilePicture = [{
          url: result.url,
          publicId: result.publicId,
          originalName: file.originalname,
          size: file.size
        }];
      }

      // Procesar fotos de viaje
      if (files.photos && files.photos.length > 0) {
        const uploadPromises = files.photos.map(async (file) => {
          const result = await this.imageService.uploadTripPhoto(
            file.buffer,
            file.originalname,
            req.user?.userId
          );

          return {
            url: result.url,
            publicId: result.publicId,
            originalName: file.originalname,
            size: file.size
          };
        });

        req.processedFiles.photos = await Promise.all(uploadPromises);
      }

      // Procesar documentos
      if (files.documents && files.documents.length > 0) {
        const uploadPromises = files.documents.map(async (file) => {
          const result = await this.imageService.uploadDocument(
            file.buffer,
            file.originalname,
            req.user?.userId
          );

          return {
            url: result.url,
            publicId: result.publicId,
            originalName: file.originalname,
            size: file.size
          };
        });

        req.processedFiles.documents = await Promise.all(uploadPromises);
      }

      this.logger.info('Archivos mixtos procesados exitosamente');
      next();
    } catch (error) {
      this.logger.error('Error procesando archivos mixtos:', error);
      ResponseUtils.error(res, 400, 'UPLOAD_ERROR', 'Error procesando archivos');
    }
  };

  // Middleware para manejar errores de multer
  public static handleUploadError = (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (error instanceof multer.MulterError) {
      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          ResponseUtils.error(
            res,
            413,
            'FILE_TOO_LARGE',
            `Archivo demasiado grande. Máximo: ${APP_LIMITS.MAX_UPLOAD_SIZE / 1024 / 1024}MB`
          );
          break;
        case 'LIMIT_FILE_COUNT':
          ResponseUtils.error(res, 400, 'TOO_MANY_FILES', 'Demasiados archivos');
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          ResponseUtils.error(res, 400, 'UNEXPECTED_FILE', 'Campo de archivo inesperado');
          break;
        default:
          ResponseUtils.error(res, 400, 'UPLOAD_ERROR', error.message);
      }
    } else if (error.message.includes('Tipo de archivo no permitido')) {
      ResponseUtils.error(
        res,
        400,
        'INVALID_FILE_TYPE',
        `Tipos de archivo permitidos: ${ALLOWED_FILE_TYPES.IMAGES.join(', ')}`
      );
    } else {
      next(error);
    }
  };

  // Limpiar archivos en caso de error
  public static cleanupOnError = async (req: Request): Promise<void> => {
    if (req.processedFiles) {
      const deletePromises: Promise<void>[] = [];

      Object.values(req.processedFiles).forEach(files => {
        files.forEach(file => {
          deletePromises.push(
            this.imageService.deleteImage(file.publicId).catch(error => {
              this.logger.warn(`Error eliminando archivo ${file.publicId}:`, error);
            })
          );
        });
      });

      await Promise.all(deletePromises);
      this.logger.info('Archivos limpiados después del error');
    }
  };

  // Validar dimensiones de imagen
  public static validateImageDimensions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (req.file && req.file.mimetype.startsWith('image/')) {
        const dimensions = await this.imageService.getImageDimensions(req.file.buffer);
        
        // Validar dimensiones mínimas para imagen de perfil
        if (req.file.fieldname === 'profilePicture') {
          if (dimensions.width < 100 || dimensions.height < 100) {
            ResponseUtils.error(
              res,
              400,
              'INVALID_DIMENSIONS',
              'La imagen de perfil debe ser mínimo 100x100 píxeles'
            );
            return;
          }
        }
      }
      
      next();
    } catch (error) {
      this.logger.error('Error validando dimensiones:', error);
      ResponseUtils.error(res, 400, 'VALIDATION_ERROR', 'Error validando imagen');
    }
  };
}