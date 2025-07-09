import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserService } from '../../domain/UserService';
import { TokenService } from '../../../../shared/services/TokenService';
import { EmailService } from '../../../../shared/services/EmailService';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ValidationUtils } from '../../../../shared/utils/ValidationUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { LoginUserDTO, AuthResponseDTO, UserDTOMapper } from '../dtos/CreateUserDTO';

export interface LoginContext {
  ip?: string;
  userAgent?: string;
}

export class LoginUserUseCase {
  private userService: UserService;
  private tokenService: TokenService;

  constructor(
    private userRepository: IUserRepository,
    emailService: EmailService,
    eventBus: EventBus,
    logger: LoggerService
  ) {
    this.userService = new UserService(userRepository, emailService, eventBus, logger);
    this.tokenService = TokenService.getInstance();
  }

  public async execute(
    dto: LoginUserDTO,
    context?: LoginContext
  ): Promise<AuthResponseDTO> {
    // Validar datos de entrada
    const validation = ValidationUtils.validate(
      ValidationUtils.loginSchema,
      dto
    );

    if (!validation.isValid) {
      throw ErrorHandler.createValidationError(validation.error!, validation.details);
    }

    // Verificar credenciales usando el servicio de dominio
    const user = await this.userService.verifyCredentials(
      dto.correo_electronico,
      dto.password,
      context?.ip,
      context?.userAgent
    );

    // Generar tokens
    const tokens = this.tokenService.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: 'user'
    });

    // Agregar refresh token al usuario
    user.addRefreshToken(tokens.refreshToken);
    await this.userRepository.update(user);

    // Convertir a DTO de respuesta
    return UserDTOMapper.toAuthResponse(user.toPublicData(), tokens);
  }
}