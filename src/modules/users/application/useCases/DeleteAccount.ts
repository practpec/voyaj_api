// src/modules/users/application/useCases/DeleteAccount.ts
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

  public async execute(userId: string): Promise<void> {
    await this.userService.deleteAccount(userId);
  }
}