import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserService } from '../../domain/UserService';
import { EmailService } from '../../../../shared/services/EmailService';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ValidationUtils } from '../../../../shared/utils/ValidationUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { VerifyEmailDTO, AuthenticatedUserDTO, UserDTOMapper } from '../dtos/CreateUserDTO';

export class VerifyEmailUseCase {
  private userService: UserService;

  constructor(
    private userRepository: IUserRepository,
    emailService: EmailService,
    eventBus: EventBus,
    logger: LoggerService
  ) {
    this.userService = new UserService(userRepository, emailService, eventBus, logger);
  }

  public async execute(dto: VerifyEmailDTO): Promise<AuthenticatedUserDTO> {
    // Validar datos de entrada
    const validation = ValidationUtils.validate(
      ValidationUtils.verifyEmailSchema,
      dto
    );

    if (!validation.isValid) {
      throw ErrorHandler.createValidationError(validation.error!, validation.details);
    }

    // Verificar email usando el servicio de dominio
    const user = await this.userService.verifyEmail(
      dto.correo_electronico,
      dto.code
    );

    // Convertir a DTO de respuesta
    return UserDTOMapper.toAuthenticatedUser(user.toPublicData());
  }
}