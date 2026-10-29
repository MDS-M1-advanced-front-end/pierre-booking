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
import { Throttle } from '@nestjs/throttler';
import { NonEmptyBodyPipe } from '../../../../common/non-empty-body.pipe.js';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password.use-case.js';
import { GetUserUseCase } from '../../application/use-cases/get-user.use-case.js';
import { LoginUserUseCase } from '../../application/use-cases/login-user.use-case.js';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case.js';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case.js';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case.js';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.decorators.js';
import {
  AuthResponseDTO,
  ChangePasswordDTO,
  LoginDTO,
  RefreshDTO,
  RegisterDTO,
  UpdateProfileDTO,
} from '../dtos/auth.dto.js';
import { toUserDTO } from '../dtos/user-dto.mapper.js';
import { UserDTO } from '../dtos/users.dto.js';
import { UserExceptionFilter } from '../filters/user-exception.filter.js';

/**
 * Limite des routes publiques d'authentification, contre le bruteforce des mots de passe
 * et des jetons : 5 requêtes par minute et par IP.
 */
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

/**
 * Routes /auth : inscription, connexion, profil et mot de passe de l'utilisateur connecté.
 */
@Controller('auth')
@UseFilters(UserExceptionFilter)
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
  ) {}

  /**
   * POST /auth/register : crée un compte CLIENT. Route publique.
   * @param dto - Prénom, nom, e-mail et mot de passe.
   * @returns L'utilisateur créé (201) ; 409 si l'e-mail est pris.
   */
  @Public()
  @Throttle(AUTH_THROTTLE)
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

  /**
   * POST /auth/login : connexion. Route publique.
   * @param dto - E-mail et mot de passe.
   * @returns Les jetons d'accès et de rafraîchissement et l'utilisateur (200) ; 401 si les identifiants sont faux.
   */
  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDTO): Promise<AuthResponseDTO> {
    const { short, long, user } = await this.loginUserUseCase.execute(
      dto.email,
      dto.password,
    );
    return {
      accessToken: short.accessToken,
      expiresIn: short.expiresIn,
      refreshToken: long.accessToken,
      user: toUserDTO(user),
    };
  }

  /**
   * POST /auth/refresh : nouveaux jetons à partir d'un jeton de rafraîchissement. Route publique
   * (le jeton d'accès est justement expiré).
   * @param dto - Jeton de rafraîchissement remis à la connexion.
   * @returns Un nouveau jeton d'accès, un nouveau jeton de rafraîchissement et l'utilisateur (200) ;
   * 401 si le jeton est invalide, expiré ou si le compte n'existe plus.
   */
  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDTO): Promise<AuthResponseDTO> {
    const { short, long, user } = await this.refreshTokenUseCase.execute(
      dto.refreshToken,
    );
    return {
      accessToken: short.accessToken,
      expiresIn: short.expiresIn,
      refreshToken: long.accessToken,
      user: toUserDTO(user),
    };
  }

  /**
   * GET /auth/me : profil de l'utilisateur connecté.
   * @param user - Utilisateur connecté.
   * @returns L'utilisateur.
   */
  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<UserDTO> {
    return toUserDTO(await this.getUserUseCase.execute(user.id));
  }

  /**
   * PATCH /auth/me : modifie le profil de l'utilisateur connecté.
   * Le rôle ne se modifie pas ici (UpdateProfileDTO ne l'accepte pas).
   * @param user - Utilisateur connecté.
   * @param dto - Prénom, nom, e-mail ; au moins un champ.
   * @returns L'utilisateur modifié ; 409 si l'e-mail est pris.
   */
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

  /**
   * PATCH /auth/password : change le mot de passe de l'utilisateur connecté (204).
   * @param user - Utilisateur connecté.
   * @param dto - Mot de passe actuel et nouveau ; 400 si le mot de passe actuel est faux.
   */
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
