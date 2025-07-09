import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserService } from '../../domain/UserService';
import { EmailService } from '../../../../shared/services/EmailService';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ValidationUtils } from '../../../../shared/utils/ValidationUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';

export interface ResendVerificationDTO {
  correo_electronico: string;
}

export class ResendVerificationUseCase {
  private userService: UserService;

  constructor(
    private userRepository: IUserRepository,
    emailService: EmailService,
    eventBus: EventBus,
    logger: LoggerService
  ) {
    this.userService = new UserService(userRepository, emailService, eventBus, logger);
  }

  public async execute(dto: ResendVerificationDTO): Promise<void> {
    // Validar datos de entrada
    const validation = ValidationUtils.validate(
      ValidationUtils.resendVerificationSchema,
      dto
    );

    if (!validation.isValid) {
      throw ErrorHandler.createValidationError(validation.error!, validation.details);
    }

    // Reenviar código de verificación usando el servicio de dominio
    await this.userService.resendVerificationCode(dto.correo_electronico);
  }
}