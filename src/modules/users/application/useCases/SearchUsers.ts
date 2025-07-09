import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { PaginationUtils, PaginatedResult } from '../../../../shared/utils/PaginationUtils';
import { ValidationUtils } from '../../../../shared/utils/ValidationUtils';
import { ErrorHandler } from '../../../../shared/utils/ErrorUtils';
import { UserSearchResultDTO, UserDTOMapper } from '../dtos/CreateUserDTO';
import { SearchUsersDTO } from '../dtos/SearchUsersDTO';

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

    // Crear opciones de paginación
    const paginationOptions = PaginationUtils.createPaginationOptions(dto);
    
    // Buscar usuarios
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