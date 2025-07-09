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