import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { PublicUserDTO, UserDTOMapper } from '../dtos/CreateUserDTO';

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