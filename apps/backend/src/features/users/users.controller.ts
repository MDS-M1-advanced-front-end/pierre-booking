import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  PaginatedUsersDTO,
  UpdateUserDTO,
  UserDTO,
  UsersQueryDTO,
} from './users.dto.js';

@Controller('users')
export class UsersController {
  @Get()
  findAll(@Query() query: UsersQueryDTO): PaginatedUsersDTO {
    throw new NotImplementedException();
  }

  @Get(':userId')
  findOne(@Param('userId', ParseUUIDPipe) userId: string): UserDTO {
    throw new NotImplementedException();
  }

  @Patch(':userId')
  update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: UpdateUserDTO,
  ): UserDTO {
    throw new NotImplementedException();
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('userId', ParseUUIDPipe) userId: string): void {
    throw new NotImplementedException();
  }
}
