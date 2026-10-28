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
import { toSkipTake } from '../../../../common/pagination.dto.js';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case.js';
import { GetUserUseCase } from '../../application/use-cases/get-user.use-case.js';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case.js';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case.js';
import { UserRole } from '../../domain/entities/user.entity.js';
import { Roles } from '../auth/auth.decorators.js';
import { toUserDTO } from '../dtos/user-dto.mapper.js';
import {
  PaginatedUsersDTO,
  UpdateUserDTO,
  UserDTO,
  UsersQueryDTO,
} from '../dtos/users.dto.js';
import { UserExceptionFilter } from '../filters/user-exception.filter.js';

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

  @Get(':userId')
  async findOne(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserDTO> {
    return toUserDTO(await this.getUserUseCase.execute(userId));
  }

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

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('userId', ParseUUIDPipe) userId: string): Promise<void> {
    return this.deleteUserUseCase.execute(userId);
  }
}
