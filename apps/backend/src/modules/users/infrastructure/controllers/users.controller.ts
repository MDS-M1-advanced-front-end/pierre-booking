import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseFilters,
} from '@nestjs/common';
import { toSkipTake } from '../../../../common/pagination.dto';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { GetUserUseCase } from '../../application/use-cases/get-user.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case';
import { UserRole } from '../../domain/entities/user.entity';
import { Roles } from '../auth/auth.decorators';
import { toUserDTO } from '../dtos/user-dto.mapper';
import {
  PaginatedUsersDTO,
  UpdateUserDTO,
  UserDTO,
  UsersQueryDTO,
} from '../dtos/users.dto';
import { UserExceptionFilter } from '../filters/user-exception.filter';

/**
 * Routes /users : gestion des comptes, réservée aux administrateurs.
 */
@Controller('users')
@Roles(UserRole.ADMINISTRATEUR)
@UseFilters(UserExceptionFilter)
export class UsersController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  /**
   * GET /users : liste paginée.
   * @param query - Rôle (facultatif), page et taille de page.
   * @returns Une page d'utilisateurs.
   */
  @Get()
  async findAll(@Query() query: UsersQueryDTO): Promise<PaginatedUsersDTO> {
    const { page, pageSize } = toSkipTake(query);
    const { items, total } = await this.listUsersUseCase.execute({
      role: query.role,
      page,
      pageSize,
    });
    return { items: items.map(toUserDTO), page, pageSize, total };
  }

  /**
   * GET /users/{userId}.
   * @param userId - UUID de l'utilisateur.
   * @returns L'utilisateur ; 404 s'il n'existe pas.
   */
  @Get(':userId')
  async findOne(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserDTO> {
    return toUserDTO(await this.getUserUseCase.execute(userId));
  }

  /**
   * PATCH /users/{userId} : modification, rôle compris.
   * @param userId - UUID de l'utilisateur.
   * @param dto - Champs à modifier.
   * @returns L'utilisateur modifié ; 404 s'il n'existe pas, 409 si l'e-mail est pris.
   */
  @Patch(':userId')
  async update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserDTO,
  ): Promise<UserDTO> {
    const user = await this.updateUserUseCase.execute(userId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      role: dto.role,
    });
    return toUserDTO(user);
  }

  /**
   * DELETE /users/{userId} (204).
   * @param userId - UUID de l'utilisateur ; 404 s'il n'existe pas, 409 s'il a des réservations.
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('userId', ParseUUIDPipe) userId: string): Promise<void> {
    return this.deleteUserUseCase.execute(userId);
  }
}
