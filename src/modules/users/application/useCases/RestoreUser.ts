// src/modules/users/application/useCases/RestoreUser.ts
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserService } from '../../domain/UserService';
import { EmailService } from '../../../../shared/services/EmailService';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { AuthenticatedUserDTO, UserDTOMapper } from '../dtos/CreateUserDTO';

export class RestoreUserUseCase {
  private userService: UserService;

  constructor(
    private userRepository: IUserRepository,
    emailService: EmailService,
    eventBus: EventBus,
    logger: LoggerService
  ) {
    this.userService = new UserService(userRepository, emailService, eventBus, logger);
  }

  public async execute(userId: string, adminUserId: string): Promise<AuthenticatedUserDTO> {
    const user = await this.userService.restoreUser(userId, adminUserId);
    return UserDTOMapper.toAuthenticatedUser(user.toPublicData());
  }
}