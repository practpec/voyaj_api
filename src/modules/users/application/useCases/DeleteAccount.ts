import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserService } from '../../domain/UserService';
import { EmailService } from '../../../../shared/services/EmailService';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';

export class DeleteAccountUseCase {
  private userService: UserService;

  constructor(
    private userRepository: IUserRepository,
    emailService: EmailService,
    eventBus: EventBus,
    logger: LoggerService
  ) {
    this.userService = new UserService(userRepository, emailService, eventBus, logger);
  }

  public async execute(userId: string, confirmPassword?: string): Promise<void> {
    // Si se proporciona contraseña, validarla primero
    if (confirmPassword) {
      const user = await this.userRepository.findById(userId);
      if (user) {
        const isValidPassword = await user.verifyPassword(confirmPassword);
        if (!isValidPassword) {
          throw new Error('Contraseña incorrecta');
        }
      }
    }

    // Eliminar cuenta usando el servicio de dominio
    await this.userService.deleteAccount(userId);
  }
}