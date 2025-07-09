// src/modules/users/application/useCases/ChangePassword.ts
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserService } from '../../domain/UserService';
import { EmailService } from '../../../../shared/services/EmailService';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ValidationUtils } from '../../../../shared/utils/ValidationUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { ChangePasswordDTO } from '../dtos/CreateUserDTO';

export class ChangePasswordUseCase {
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
    dto: ChangePasswordDTO,
    ip?: string
  ): Promise<void> {
    // Validar datos de entrada
    const validation = ValidationUtils.validate(
      ValidationUtils.changePasswordSchema,
      dto
    );

    if (!validation.isValid) {
      throw ErrorHandler.createValidationError(validation.error!, validation.details);
    }

    await this.userService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
      ip
    );
  }
}