import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { 
  UpdatePreferencesDTO, 
  AuthenticatedUserDTO, 
  UserDTOMapper 
} from '../dtos/CreateUserDTO';

export class UpdatePreferencesUseCase {
  private logger: LoggerService;

  constructor(
    private userRepository: IUserRepository,
    logger: LoggerService
  ) {
    this.logger = logger;
  }

  public async execute(
    userId: string,
    dto: UpdatePreferencesDTO
  ): Promise<AuthenticatedUserDTO> {
    // Validar datos de entrada
    const validation = this.validatePreferences(dto);
    if (!validation.isValid) {
      throw ErrorHandler.createValidationError(
        validation.error || 'Datos de preferencias inválidos',
        validation.details
      );
    }

    // Buscar usuario
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw ErrorHandler.createUserNotFoundError();
    }

    if (user.isDeleted) {
      throw ErrorHandler.createUserDeletedError();
    }

    try {
      // Actualizar preferencias del usuario - convertir DTO a formato compatible
      const preferencesUpdate: any = {};
      
      if (dto.language !== undefined) preferencesUpdate.language = dto.language;
      if (dto.currency !== undefined) preferencesUpdate.currency = dto.currency;
      if (dto.theme !== undefined) preferencesUpdate.theme = dto.theme;
      if (dto.timezone !== undefined) preferencesUpdate.timezone = dto.timezone;
      
      if (dto.notifications !== undefined) {
        preferencesUpdate.notifications = {};
        Object.keys(dto.notifications).forEach(key => {
          if (dto.notifications![key as keyof typeof dto.notifications] !== undefined) {
            preferencesUpdate.notifications[key] = dto.notifications![key as keyof typeof dto.notifications];
          }
        });
      }
      
      if (dto.privacy !== undefined) {
        preferencesUpdate.privacy = {};
        Object.keys(dto.privacy).forEach(key => {
          if (dto.privacy![key as keyof typeof dto.privacy] !== undefined) {
            preferencesUpdate.privacy[key] = dto.privacy![key as keyof typeof dto.privacy];
          }
        });
      }
      
      user.updatePreferences(preferencesUpdate);
      
      // Guardar cambios
      await this.userRepository.update(user);

      this.logger.info(`Preferencias actualizadas para usuario: ${userId}`, {
        userId,
        updatedFields: Object.keys(dto)
      });

      // Retornar perfil completo actualizado
      return UserDTOMapper.toAuthenticatedUser(user.toPublicData());

    } catch (error) {
      this.logger.error(`Error actualizando preferencias para usuario ${userId}:`, error);
      throw new Error('Error actualizando preferencias del usuario');
    }
  }

  private validatePreferences(dto: UpdatePreferencesDTO): {
    isValid: boolean;
    error?: string;
    details?: any[];
  } {
    const errors: string[] = [];

    // Validar idioma
    if (dto.language !== undefined) {
      const validLanguages = ['es', 'en', 'fr', 'pt'];
      if (!validLanguages.includes(dto.language)) {
        errors.push('Idioma no válido. Opciones: es, en, fr, pt');
      }
    }

    // Validar moneda
    if (dto.currency !== undefined) {
      const validCurrencies = ['USD', 'EUR', 'MXN', 'GBP', 'CAD'];
      if (!validCurrencies.includes(dto.currency)) {
        errors.push('Moneda no válida. Opciones: USD, EUR, MXN, GBP, CAD');
      }
    }

    // Validar tema
    if (dto.theme !== undefined) {
      const validThemes = ['light', 'dark', 'auto'];
      if (!validThemes.includes(dto.theme)) {
        errors.push('Tema no válido. Opciones: light, dark, auto');
      }
    }

    // Validar timezone
    if (dto.timezone !== undefined) {
      if (typeof dto.timezone !== 'string' || dto.timezone.trim() === '') {
        errors.push('Timezone debe ser una cadena de texto válida');
      }
    }

    // Validar configuraciones de notificaciones
    if (dto.notifications !== undefined) {
      const notificationKeys = ['email', 'push', 'marketing', 'tripUpdates', 'friendRequests'];
      for (const key of notificationKeys) {
        if (dto.notifications[key as keyof typeof dto.notifications] !== undefined && 
            typeof dto.notifications[key as keyof typeof dto.notifications] !== 'boolean') {
          errors.push(`La configuración de notificación '${key}' debe ser un valor booleano`);
        }
      }
    }

    // Validar configuraciones de privacidad
    if (dto.privacy !== undefined) {
      const privacyKeys = ['profilePublic', 'showEmail', 'allowMessages', 'showOnlineStatus'];
      for (const key of privacyKeys) {
        if (dto.privacy[key as keyof typeof dto.privacy] !== undefined && 
            typeof dto.privacy[key as keyof typeof dto.privacy] !== 'boolean') {
          errors.push(`La configuración de privacidad '${key}' debe ser un valor booleano`);
        }
      }
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        error: errors[0],
        details: errors.map(error => ({ message: error }))
      };
    }

    return { isValid: true };
  }
}