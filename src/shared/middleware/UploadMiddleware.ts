import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ImageService } from '../services/ImageService';
import { LoggerService } from '../services/LoggerService';
import { ResponseUtils } from '../utils/ResponseUtils';
import { ALLOWED_FILE_TYPES, APP_LIMITS } from '../constants';

export class UploadMiddleware {
  private static imageService = ImageService.getInstance();
  private static logger = LoggerService.getInstance();

  // Configuración de multer para memoria
  private static storage = multer.memoryStorage();

  // Filtro de archivos
  private static fileFilter = (req: any, file: any, cb: any) => {
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

  // Procesar imagen de perfil
  public static processProfilePicture = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const file = (req as any).file;
      if (!file) {
        next();
        return;
      }

      this.logger.info(`Procesando imagen de perfil: ${file.originalname}`);

      // Subir a Cloudinary con transformaciones para perfil
      const result = await this.imageService.uploadProfilePicture(
        file.buffer,
        file.originalname,
        (req as any).user?.userId
      );

      // Agregar resultado al request
      (req as any).processedFiles = {
        profilePicture: [{
          url: result.url,
          publicId: result.publicId,
          originalName: file.originalname,
          size: file.size
        }]
      };

      this.logger.info(`Imagen de perfil procesada exitosamente: ${result.publicId}`);
      next();
    } catch (error) {
      this.logger.error('Error procesando imagen de perfil:', error);
      ResponseUtils.error(res, 400, 'UPLOAD_ERROR', 'Error procesando imagen de perfil');
    }
  };

  // Middleware para subir imagen de perfil (single)
  public static uploadProfilePicture = [
    this.upload.single('profilePicture'),
    this.processProfilePicture
  ];

  // Procesar fotos de viaje
  public static processTripPhotos = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const files = (req as any).files;
      if (!files || !Array.isArray(files) || files.length === 0) {
        next();
        return;
      }

      this.logger.info(`Procesando ${files.length} fotos de viaje`);

      const uploadPromises = files.map(async (file: any) => {
        const result = await this.imageService.uploadTripPhoto(
          file.buffer,
          file.originalname,
          (req as any).user?.userId
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
      (req as any).processedFiles = {
        photos: results
      };

      this.logger.info(`${results.length} fotos de viaje procesadas exitosamente`);
      next();
    } catch (error) {
      this.logger.error('Error procesando fotos de viaje:', error);
      ResponseUtils.error(res, 400, 'UPLOAD_ERROR', 'Error procesando fotos de viaje');
    }
  };

  // Middleware para subir múltiples imágenes de viaje
  public static uploadTripPhotos = [
    this.upload.array('photos', 10),
    this.processTripPhotos
  ];

  // Procesar archivos mixtos
  public static processMixedFiles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const files = (req as any).files;
      if (!files || typeof files !== 'object') {
        next();
        return;
      }

      (req as any).processedFiles = {};

      // Procesar imagen de perfil
      if (files.profilePicture && files.profilePicture.length > 0) {
        const file = files.profilePicture[0];
        const result = await this.imageService.uploadProfilePicture(
          file.buffer,
          file.originalname,
          (req as any).user?.userId
        );

        (req as any).processedFiles.profilePicture = [{
          url: result.url,
          publicId: result.publicId,
          originalName: file.originalname,
          size: file.size
        }];
      }

      // Procesar fotos de viaje
      if (files.photos && files.photos.length > 0) {
        const uploadPromises = files.photos.map(async (file: any) => {
          const result = await this.imageService.uploadTripPhoto(
            file.buffer,
            file.originalname,
            (req as any).user?.userId
          );

          return {
            url: result.url,
            publicId: result.publicId,
            originalName: file.originalname,
            size: file.size
          };
        });

        (req as any).processedFiles.photos = await Promise.all(uploadPromises);
      }

      // Procesar documentos
      if (files.documents && files.documents.length > 0) {
        const uploadPromises = files.documents.map(async (file: any) => {
          const result = await this.imageService.uploadDocument(
            file.buffer,
            file.originalname,
            (req as any).user?.userId
          );

          return {
            url: result.url,
            publicId: result.publicId,
            originalName: file.originalname,
            size: file.size
          };
        });

        (req as any).processedFiles.documents = await Promise.all(uploadPromises);
      }

      this.logger.info('Archivos mixtos procesados exitosamente');
      next();
    } catch (error) {
      this.logger.error('Error procesando archivos mixtos:', error);
      ResponseUtils.error(res, 400, 'UPLOAD_ERROR', 'Error procesando archivos');
    }
  };

  // Middleware para subir archivos mixtos
  public static uploadMixed = [
    this.upload.fields([
      { name: 'profilePicture', maxCount: 1 },
      { name: 'photos', maxCount: 10 },
      { name: 'documents', maxCount: 5 }
    ]),
    this.processMixedFiles
  ];

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
    const processedFiles = (req as any).processedFiles;
    if (processedFiles) {
      const deletePromises: Promise<void>[] = [];

      Object.values(processedFiles).forEach((files: any) => {
        files.forEach((file: any) => {
          deletePromises.push(
            this.imageService.deleteImage(file.publicId).catch((error: any) => {
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
      const file = (req as any).file;
      if (file && file.mimetype.startsWith('image/')) {
        const dimensions = await this.imageService.getImageDimensions(file.buffer);
        
        // Validar dimensiones mínimas para imagen de perfil
        if (file.fieldname === 'profilePicture') {
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