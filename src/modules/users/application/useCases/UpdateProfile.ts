// src/modules/users/application/useCases/UpdateProfile.ts
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserService } from '../../domain/UserService';
import { EmailService } from '../../../../shared/services/EmailService';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ValidationUtils } from '../../../../shared/utils/ValidationUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { UpdateProfileDTO, AuthenticatedUserDTO, UserDTOMapper } from '../dtos/CreateUserDTO';

export class UpdateProfileUseCase {
  private userService: UserService;

  constructor(
    private userRepository: IUserRepository,
    emailService: EmailService,
    eventBus: EventBus,
    logger: LoggerService
  ) {
    this.userService = new UserService(userRepository, emailService, eventBus, logger);
  }

  public async execute(
    userId: string,
    dto: UpdateProfileDTO
  ): Promise<AuthenticatedUserDTO> {
    // Validar datos de entrada
    const validation = ValidationUtils.validate(
      ValidationUtils.updateProfileSchema,
      dto
    );

    if (!validation.isValid) {
      throw ErrorHandler.createValidationError(validation.error!, validation.details);
    }

    const user = await this.userService.updateProfile(userId, {
      name: dto.nombre,
      profilePictureUrl: dto.url_foto_perfil
    });

    return UserDTOMapper.toAuthenticatedUser(user.toPublicData());
  }
}