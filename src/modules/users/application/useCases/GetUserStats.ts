// src/modules/users/application/useCases/GetUserStats.ts
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserService } from '../../domain/UserService';
import { EmailService } from '../../../../shared/services/EmailService';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { UserStatsDTO } from '../dtos/CreateUserDTO';

export class GetUserStatsUseCase {
  private userService: UserService;

  constructor(
    private userRepository: IUserRepository,
    emailService: EmailService,
    eventBus: EventBus,
    logger: LoggerService
  ) {
    this.userService = new UserService(userRepository, emailService, eventBus, logger);
  }

  public async execute(): Promise<UserStatsDTO> {
    return await this.userService.getUserStats();
  }
}