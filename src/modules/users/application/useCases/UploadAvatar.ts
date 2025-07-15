import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { ImageService } from '../../../../shared/services/ImageService';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { AvatarUploadResponseDTO, UserDTOMapper } from '../dtos/CreateUserDTO';

export class UploadAvatarUseCase {
  private imageService: ImageService;
  private logger: LoggerService;

  constructor(
    private userRepository: IUserRepository,
    imageService: ImageService,
    logger: LoggerService
  ) {
    this.imageService = imageService;
    this.logger = logger;
  }

  public async execute(
    userId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }
  ): Promise<AvatarUploadResponseDTO> {
    // Buscar usuario
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw ErrorHandler.createUserNotFoundError();
    }

    if (user.isDeleted) {
      throw ErrorHandler.createUserDeletedError();
    }

    try {
      // Validar el archivo
      this.validateImageFile(file);

      // Subir imagen como avatar
      const uploadResult = await this.imageService.uploadProfilePicture(
        file.buffer,
        file.originalname,
        userId
      );

      // Si había un avatar anterior, eliminarlo
      if (user.profilePictureUrl) {
        try {
          // Extraer publicId del URL anterior si es de Cloudinary
          const oldPublicId = this.extractPublicIdFromUrl(user.profilePictureUrl);
          if (oldPublicId) {
            await this.imageService.deleteImage(oldPublicId);
          }
        } catch (error) {
          this.logger.warn(`No se pudo eliminar avatar anterior: ${error}`);
        }
      }

      // Actualizar usuario con nueva URL de avatar
      user.updateAvatar(uploadResult.secureUrl);
      await this.userRepository.update(user);

      this.logger.info(`Avatar actualizado para usuario: ${userId}`, {
        userId,
        newAvatarUrl: uploadResult.secureUrl,
        publicId: uploadResult.publicId,
        imageSize: file.size
      });

      return UserDTOMapper.toAvatarResponse(uploadResult.secureUrl);

    } catch (error) {
      this.logger.error(`Error subiendo avatar para usuario ${userId}:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('formato')) {
          throw ErrorHandler.createValidationError('Formato de imagen no válido. Solo se permiten: JPG, PNG, WebP, GIF');
        }
        if (error.message.includes('tamaño')) {
          throw ErrorHandler.createValidationError('El archivo es demasiado grande. Máximo 10MB');
        }
      }
      
      throw new Error('Error procesando la imagen del avatar');
    }
  }

  private validateImageFile(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  }): void {
    // Validar tipo MIME
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('Formato de imagen no válido');
    }

    // Validar tamaño (10MB máximo)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('El archivo es demasiado grande');
    }

    // Validar que el buffer no esté vacío
    if (!file.buffer || file.buffer.length === 0) {
      throw new Error('El archivo está vacío');
    }

    // Validar nombre de archivo
    if (!file.originalname || file.originalname.trim() === '') {
      throw new Error('Nombre de archivo inválido');
    }
  }

  private extractPublicIdFromUrl(url: string): string | null {
    try {
      // Para URLs de Cloudinary: https://res.cloudinary.com/cloud-name/image/upload/v123456/folder/image.jpg
      // Extraer todo después de /upload/ hasta la extensión
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
      if (match && match[1]) {
        return match[1];
      }
      
      // Si no es Cloudinary, retornar null
      return null;
    } catch (error) {
      this.logger.warn(`Error extrayendo publicId de URL: ${url}`, error);
      return null;
    }
  }
}