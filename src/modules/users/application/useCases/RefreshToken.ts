// src/modules/users/application/useCases/RefreshToken.ts
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { TokenService } from '../../../../shared/services/TokenService';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { ValidationUtils } from '../../../../shared/utils/ValidationUtils';
import { RefreshTokenDTO, TokenResponseDTO } from '../dtos/CreateUserDTO';

export class RefreshTokenUseCase {
  private tokenService: TokenService;

  constructor(private userRepository: IUserRepository) {
    this.tokenService = TokenService.getInstance();
  }

  public async execute(dto: RefreshTokenDTO): Promise<TokenResponseDTO> {
    // Validar datos de entrada
    const validation = ValidationUtils.validate(
      ValidationUtils.refreshTokenSchema,
      dto
    );

    if (!validation.isValid) {
      throw ErrorHandler.createValidationError(validation.error!, validation.details);
    }

    // Verificar refresh token
    const decoded = this.tokenService.verifyRefreshToken(dto.refreshToken);

    // Buscar usuario por refresh token
    const user = await this.userRepository.findByRefreshToken(dto.refreshToken);
    
    if (!user) {
      throw ErrorHandler.createTokenInvalidError();
    }

    if (user.isDeleted) {
      throw ErrorHandler.createUserDeletedError();
    }

    if (user.isBlocked) {
      throw ErrorHandler.createAccountLockedError();
    }

    // Generar nuevos tokens
    const tokens = this.tokenService.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: 'user'
    });

    // Remover el refresh token anterior y agregar el nuevo
    user.removeRefreshToken(dto.refreshToken);
    user.addRefreshToken(tokens.refreshToken);
    await this.userRepository.update(user);

    return { tokens };
  }
}

// src/modules/users/application/useCases/LogoutUser.ts
import { UserService } from '../../domain/UserService';
import { EmailService } from '../../../../shared/services/EmailService';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';

export class LogoutUserUseCase {
  private userService: UserService;

  constructor(
    private userRepository: IUserRepository,
    emailService: EmailService,
    eventBus: EventBus,
    logger: LoggerService
  ) {
    this.userService = new UserService(userRepository, emailService, eventBus, logger);
  }

  public async execute(userId: string, refreshToken: string): Promise<void> {
    await this.userService.logout(userId, refreshToken);
  }
}

// src/modules/users/application/useCases/ForgotPassword.ts
export class ForgotPasswordUseCase {
  private userService: UserService;

  constructor(
    private userRepository: IUserRepository,
    emailService: EmailService,
    eventBus: EventBus,
    logger: LoggerService
  ) {
    this.userService = new UserService(userRepository, emailService, eventBus, logger);
  }

  public async execute(dto: ForgotPasswordDTO, ip?: string): Promise<void> {
    // Validar datos de entrada
    const validation = ValidationUtils.validate(
      ValidationUtils.forgotPasswordSchema,
      dto
    );

    if (!validation.isValid) {
      throw ErrorHandler.createValidationError(validation.error!, validation.details);
    }

    await this.userService.requestPasswordReset(dto.correo_electronico, ip);
  }
}

// src/modules/users/application/useCases/ResetPassword.ts
export class ResetPasswordUseCase {
  private userService: UserService;

  constructor(
    private userRepository: IUserRepository,
    emailService: EmailService,
    eventBus: EventBus,
    logger: LoggerService
  ) {
    this.userService = new UserService(userRepository, emailService, eventBus, logger);
  }

  public async execute(dto: ResetPasswordDTO, ip?: string): Promise<void> {
    // Validar datos de entrada
    const validation = ValidationUtils.validate(
      ValidationUtils.resetPasswordSchema,
      dto
    );

    if (!validation.isValid) {
      throw ErrorHandler.createValidationError(validation.error!, validation.details);
    }

    await this.userService.resetPassword(
      dto.correo_electronico,
      dto.code,
      dto.newPassword,
      ip
    );
  }
}

// src/modules/users/application/useCases/ResendVerification.ts
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

    await this.userService.resendVerificationCode(dto.correo_electronico);
  }
}