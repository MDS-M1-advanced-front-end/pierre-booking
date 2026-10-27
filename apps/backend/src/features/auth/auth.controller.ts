import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { UserDTO } from '../users/users.dto.js';
import { CurrentUser, Public, type AuthUser } from './auth.decorators.js';
import {
  AuthResponseDTO,
  ChangePasswordDTO,
  LoginDTO,
  RegisterDTO,
  UpdateProfileDTO,
} from './auth.dto.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() body: RegisterDTO): Promise<UserDTO> {
    return this.authService.register(body);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDTO): Promise<AuthResponseDTO> {
    return this.authService.login(body);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<UserDTO> {
    return this.authService.me(user);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateProfileDTO,
  ): Promise<UserDTO> {
    return this.authService.updateMe(user, body);
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() body: ChangePasswordDTO,
  ): Promise<void> {
    return this.authService.changePassword(user, body);
  }
}
