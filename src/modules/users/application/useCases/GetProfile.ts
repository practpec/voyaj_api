// src/modules/users/application/useCases/GetProfile.ts
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { AuthenticatedUserDTO, UserDTOMapper } from '../dtos/CreateUserDTO';

export class GetProfileUseCase {
  constructor(private userRepository: IUserRepository) {}

  public async execute(userId: string): Promise<AuthenticatedUserDTO> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw ErrorHandler.createUserNotFoundError();
    }

    if (user.isDeleted) {
      throw ErrorHandler.createUserDeletedError();
    }

    return UserDTOMapper.toAuthenticatedUser(user.toPublicData());
  }
}

// src/modules/users/application/useCases/UpdateProfile.ts
import { UserService } from '../../domain/UserService';
import { EmailService } from '../../../../shared/services/EmailService';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ValidationUtils } from '../../../../shared/utils/ValidationUtils';
import { UpdateProfileDTO } from '../dtos/CreateUserDTO';

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

// src/modules/users/application/useCases/ChangePassword.ts
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

// src/modules/users/application/useCases/DeleteAccount.ts
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

// src/modules/users/application/useCases/SearchUsers.ts
import { PaginationUtils, PaginatedResult } from '../../../../shared/utils/PaginationUtils';
import { UserSearchResultDTO, SearchUsersDTO } from '../dtos/CreateUserDTO';

export class SearchUsersUseCase {
  constructor(private userRepository: IUserRepository) {}

  public async execute(dto: SearchUsersDTO): Promise<PaginatedResult<UserSearchResultDTO>> {
    // Validar datos de entrada
    const validation = ValidationUtils.validate(
      ValidationUtils.searchUsersSchema,
      dto
    );

    if (!validation.isValid) {
      throw ErrorHandler.createValidationError(validation.error!, validation.details);
    }

    const paginationOptions = PaginationUtils.createPaginationOptions(dto);
    const result = await this.userRepository.searchByEmailOrName(
      dto.query,
      paginationOptions
    );

    // Convertir usuarios a DTOs de búsqueda
    const searchResults = result.data.map(user => 
      UserDTOMapper.toSearchResult(user.toPublicData())
    );

    return {
      data: searchResults,
      pagination: result.pagination
    };
  }
}

// src/modules/users/application/useCases/GetUserById.ts
import { PublicUserDTO } from '../dtos/CreateUserDTO';

export class GetUserByIdUseCase {
  constructor(private userRepository: IUserRepository) {}

  public async execute(userId: string): Promise<PublicUserDTO> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw ErrorHandler.createUserNotFoundError();
    }

    if (user.isDeleted) {
      throw ErrorHandler.createUserNotFoundError();
    }

    return UserDTOMapper.toPublicUser(user.toPublicData());
  }
}

// src/modules/users/application/useCases/RestoreUser.ts (Solo admin)
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

// src/modules/users/application/useCases/GetUserStats.ts (Solo admin)
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