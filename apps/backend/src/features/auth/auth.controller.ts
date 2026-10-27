import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Patch,
  Post,
} from '@nestjs/common';
import { UserDTO } from '../users/users.dto.js';
import {
  AuthResponseDTO,
  ChangePasswordDTO,
  LoginDTO,
  RegisterDTO,
} from './auth.dto.js';

@Controller('auth')
export class AuthController {
  @Post('register')
  register(@Body() body: RegisterDTO): UserDTO {
    throw new NotImplementedException();
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDTO): AuthResponseDTO {
    throw new NotImplementedException();
  }

  @Get('me')
  me(): UserDTO {
    throw new NotImplementedException();
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(@Body() body: ChangePasswordDTO): void {
    throw new NotImplementedException();
  }
}
