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
} from '@nestjs/common';
import { Roles } from '../auth/auth.decorators.js';
import {
  PaginatedUsersDTO,
  UpdateUserDTO,
  UserDTO,
  UserRole,
  UsersQueryDTO,
} from './users.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@Roles(UserRole.ADMINISTRATEUR)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() query: UsersQueryDTO): Promise<PaginatedUsersDTO> {
    return this.usersService.findAll(query);
  }

  @Get(':userId')
  findOne(@Param('userId', ParseUUIDPipe) userId: string): Promise<UserDTO> {
    return this.usersService.findOne(userId);
  }

  @Patch(':userId')
  update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: UpdateUserDTO,
  ): Promise<UserDTO> {
    return this.usersService.update(userId, body);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('userId', ParseUUIDPipe) userId: string): Promise<void> {
    return this.usersService.remove(userId);
  }
}
