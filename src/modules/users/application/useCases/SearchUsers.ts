// src/modules/users/application/useCases/SearchUsers.ts
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { ValidationUtils } from '../../../../shared/utils/ValidationUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { PaginationUtils, PaginatedResult } from '../../../../shared/utils/PaginationUtils';
import { UserSearchResultDTO, SearchUsersDTO, UserDTOMapper } from '../dtos/CreateUserDTO';

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