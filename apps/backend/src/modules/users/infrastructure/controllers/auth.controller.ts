import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseFilters,
} from '@nestjs/common';
import { NonEmptyBodyPipe } from '../../../../common/non-empty-body.pipe.js';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password.use-case.js';
import { GetUserUseCase } from '../../application/use-cases/get-user.use-case.js';
import { LoginUserUseCase } from '../../application/use-cases/login-user.use-case.js';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case.js';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case.js';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.decorators.js';
import {
  AuthResponseDTO,
  ChangePasswordDTO,
  LoginDTO,
  RegisterDTO,
  UpdateProfileDTO,
} from '../dtos/auth.dto.js';
import { toUserDTO } from '../dtos/user-dto.mapper.js';
import { UserDTO } from '../dtos/users.dto.js';
import { UserExceptionFilter } from '../filters/user-exception.filter.js';

@Controller('auth')
@UseFilters(UserExceptionFilter)
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDTO): Promise<UserDTO> {
    const user = await this.registerUserUseCase.execute(
      dto.firstName,
      dto.lastName,
      dto.email,
      dto.password,
    );
    return toUserDTO(user);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDTO): Promise<AuthResponseDTO> {
    const { accessToken, expiresIn, user } =
      await this.loginUserUseCase.execute(dto.email, dto.password);
    return { accessToken, expiresIn, user: toUserDTO(user) };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<UserDTO> {
    return toUserDTO(await this.getUserUseCase.execute(user.id));
  }

  // Le rôle ne se modifie pas ici (UpdateProfileDTO ne l'accepte pas)
  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body(NonEmptyBodyPipe) dto: UpdateProfileDTO,
  ): Promise<UserDTO> {
    const updated = await this.updateUserUseCase.execute(user.id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
    });
    return toUserDTO(updated);
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDTO,
  ): Promise<void> {
    return this.changePasswordUseCase.execute(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
