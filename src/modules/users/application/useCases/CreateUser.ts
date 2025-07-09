import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserService } from '../../domain/UserService';
import { TokenService } from '../../../../shared/services/TokenService';
import { EmailService } from '../../../../shared/services/EmailService';
import { EventBus } from '../../../../shared/events/EventBus';
import { LoggerService } from '../../../../shared/services/LoggerService';
import { ValidationUtils } from '../../../../shared/utils/ValidationUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { CreateUserDTO, AuthResponseDTO, UserDTOMapper } from '../dtos/CreateUserDTO';

export class CreateUserUseCase {
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

  public async execute(dto: CreateUserDTO): Promise<AuthResponseDTO> {
    // Validar datos de entrada
    const validation = ValidationUtils.validate(
      ValidationUtils.registerUserSchema,
      dto
    );

    if (!validation.isValid) {
      throw ErrorHandler.createValidationError(validation.error!, validation.details);
    }

    // Crear usuario usando el servicio de dominio
    const { user, verificationCode } = await this.userService.createUser(
      dto.correo_electronico,
      dto.password,
      dto.nombre
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

    // Enviar email de bienvenida con código de verificación
    const emailService = EmailService.getInstance();
    await emailService.sendWelcomeEmail(
      user.email,
      {
        name: user.name || 'Usuario',
        verificationCode
      }
    );

    // Convertir a DTO de respuesta
    return UserDTOMapper.toAuthResponse(user.toPublicData(), tokens);
  }
}