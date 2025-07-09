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