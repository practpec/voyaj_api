import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from 'cloudinary';
import sharp from 'sharp';
import { LoggerService } from './LoggerService';
import { IMAGE_CONFIG } from '../constants';

export interface ImageUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export class ImageService {
  private static instance: ImageService;
  private logger: LoggerService;

  private constructor() {
    this.logger = LoggerService.getInstance();
    this.configureCloudinary();
  }

  public static getInstance(): ImageService {
    if (!ImageService.instance) {
      ImageService.instance = new ImageService();
    }
    return ImageService.instance;
  }

  private configureCloudinary(): void {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      this.logger.warn('⚠️ Credenciales de Cloudinary no configuradas completamente');
    }
  }

  // Subir imagen de perfil con transformaciones específicas
  public async uploadProfilePicture(
    buffer: Buffer,
    originalName: string,
    userId?: string
  ): Promise<ImageUploadResult> {
    try {
      // Procesar imagen con Sharp
      const processedBuffer = await sharp(buffer)
        .resize(IMAGE_CONFIG.PROFILE_PICTURE.width, IMAGE_CONFIG.PROFILE_PICTURE.height, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: IMAGE_CONFIG.PROFILE_PICTURE.quality })
        .toBuffer();

      // Configurar opciones de subida
      const options: UploadApiOptions = {
        folder: 'voyaj/profile-pictures',
        public_id: userId ? `profile_${userId}_${Date.now()}` : undefined,
        format: 'webp',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ],
        overwrite: true,
        invalidate: true
      };

      // Subir a Cloudinary
      const result = await this.uploadToCloudinary(processedBuffer, options);
      
      this.logger.info(`Imagen de perfil subida: ${result.public_id}`);
      return this.mapCloudinaryResult(result);
    } catch (error) {
      this.logger.error('Error subiendo imagen de perfil:', error);
      throw new Error('Error procesando imagen de perfil');
    }
  }

  // Subir foto de viaje con múltiples tamaños
  public async uploadTripPhoto(
    buffer: Buffer,
    originalName: string,
    userId?: string
  ): Promise<ImageUploadResult> {
    try {
      // Procesar imagen principal
      const processedBuffer = await sharp(buffer)
        .resize(IMAGE_CONFIG.TRIP_PHOTO.width, IMAGE_CONFIG.TRIP_PHOTO.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: IMAGE_CONFIG.TRIP_PHOTO.quality })
        .toBuffer();

      const options: UploadApiOptions = {
        folder: 'voyaj/trip-photos',
        public_id: `trip_${userId || 'guest'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        format: 'webp',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ],
        eager: [
          { width: 400, height: 300, crop: 'fill', quality: 'auto:good' },
          { width: 200, height: 150, crop: 'fill', quality: 'auto:good' }
        ],
        overwrite: false
      };

      const result = await this.uploadToCloudinary(processedBuffer, options);
      
      this.logger.info(`Foto de viaje subida: ${result.public_id}`);
      return this.mapCloudinaryResult(result);
    } catch (error) {
      this.logger.error('Error subiendo foto de viaje:', error);
      throw new Error('Error procesando foto de viaje');
    }
  }

  // Subir thumbnail
  public async uploadThumbnail(
    buffer: Buffer,
    originalName: string,
    userId?: string
  ): Promise<ImageUploadResult> {
    try {
      const processedBuffer = await sharp(buffer)
        .resize(IMAGE_CONFIG.THUMBNAIL.width, IMAGE_CONFIG.THUMBNAIL.height, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: IMAGE_CONFIG.THUMBNAIL.quality })
        .toBuffer();

      const options: UploadApiOptions = {
        folder: 'voyaj/thumbnails',
        public_id: `thumb_${userId || 'guest'}_${Date.now()}`,
        format: 'webp',
        transformation: [
          { quality: 'auto:eco' },
          { fetch_format: 'auto' }
        ]
      };

      const result = await this.uploadToCloudinary(processedBuffer, options);
      
      this.logger.info(`Thumbnail subido: ${result.public_id}`);
      return this.mapCloudinaryResult(result);
    } catch (error) {
      this.logger.error('Error subiendo thumbnail:', error);
      throw new Error('Error procesando thumbnail');
    }
  }

  // Subir documento
  public async uploadDocument(
    buffer: Buffer,
    originalName: string,
    userId?: string
  ): Promise<ImageUploadResult> {
    try {
      const options: UploadApiOptions = {
        folder: 'voyaj/documents',
        public_id: `doc_${userId || 'guest'}_${Date.now()}`,
        resource_type: 'auto',
        format: 'pdf'
      };

      const result = await this.uploadToCloudinary(buffer, options);
      
      this.logger.info(`Documento subido: ${result.public_id}`);
      return this.mapCloudinaryResult(result);
    } catch (error) {
      this.logger.error('Error subiendo documento:', error);
      throw new Error('Error procesando documento');
    }
  }

  // Eliminar imagen de Cloudinary
  public async deleteImage(publicId: string): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        this.logger.info(`Imagen eliminada: ${publicId}`);
      } else {
        this.logger.warn(`No se pudo eliminar la imagen: ${publicId} - ${result.result}`);
      }
    } catch (error) {
      this.logger.error(`Error eliminando imagen ${publicId}:`, error);
      throw new Error('Error eliminando imagen');
    }
  }

  // Obtener información de imagen
  public async getImageInfo(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      this.logger.error(`Error obteniendo info de imagen ${publicId}:`, error);
      throw new Error('Error obteniendo información de imagen');
    }
  }

  // Generar URL con transformaciones personalizadas
  public generateTransformedUrl(
    publicId: string,
    transformations: any
  ): string {
    return cloudinary.url(publicId, {
      ...transformations,
      secure: true,
      fetch_format: 'auto',
      quality: 'auto:good'
    });
  }

  // Obtener dimensiones de imagen desde buffer
  public async getImageDimensions(buffer: Buffer): Promise<ImageDimensions> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0
      };
    } catch (error) {
      this.logger.error('Error obteniendo dimensiones:', error);
      throw new Error('Error procesando imagen');
    }
  }

  // Validar formato de imagen
  public async validateImageFormat(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      const allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
      return allowedFormats.includes(metadata.format || '');
    } catch (error) {
      return false;
    }
  }

  // Comprimir imagen
  public async compressImage(
    buffer: Buffer,
    quality: number = 80,
    maxWidth?: number,
    maxHeight?: number
  ): Promise<Buffer> {
    try {
      let sharpInstance = sharp(buffer);

      if (maxWidth || maxHeight) {
        sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      return await sharpInstance
        .webp({ quality })
        .toBuffer();
    } catch (error) {
      this.logger.error('Error comprimiendo imagen:', error);
      throw new Error('Error comprimiendo imagen');
    }
  }

  // Método privado para subir a Cloudinary
  private async uploadToCloudinary(
    buffer: Buffer,
    options: UploadApiOptions
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('No se recibió resultado de Cloudinary'));
          }
        }
      ).end(buffer);
    });
  }

  // Mapear resultado de Cloudinary
  private mapCloudinaryResult(result: UploadApiResponse): ImageUploadResult {
    return {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes
    };
  }

  // Limpiar imágenes antiguas
  public async cleanupOldImages(folderPath: string, daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const resources = await cloudinary.api.resources({
        type: 'upload',
        prefix: folderPath,
        max_results: 500
      });

      let deletedCount = 0;
      const deletePromises = resources.resources
        .filter((resource: any) => new Date(resource.created_at) < cutoffDate)
        .map(async (resource: any) => {
          try {
            await cloudinary.uploader.destroy(resource.public_id);
            deletedCount++;
          } catch (error) {
            this.logger.warn(`Error eliminando imagen antigua ${resource.public_id}:`, error);
          }
        });

      await Promise.all(deletePromises);
      
      this.logger.info(`Limpieza completada: ${deletedCount} imágenes eliminadas de ${folderPath}`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Error en limpieza de imágenes:', error);
      return 0;
    }
  }
}