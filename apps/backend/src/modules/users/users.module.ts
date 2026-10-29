import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { TOKEN_SERVICE } from './application/ports/token.port';
import { AuthenticateUseCase } from './application/use-cases/authenticate.use-case';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case';
import { GetUserUseCase } from './application/use-cases/get-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { AuthGuard } from './infrastructure/auth/auth.guard';
import { AuthController } from './infrastructure/controllers/auth.controller';
import { UsersController } from './infrastructure/controllers/users.controller';
import { TypeOrmUserEntity } from './infrastructure/persistence/typeorm-user.entity';
import { TypeormUserRepository } from './infrastructure/persistence/typeorm-user.repository';
import {
  JwtTokenService,
  TOKEN_TTL_SECONDS,
  jwtSecret,
} from './infrastructure/security/jwt-token.service';
import { ScryptPasswordHasher } from './infrastructure/security/scrypt-password-hasher';

/**
 * Utilisateurs et authentification. Le guard est global (APP_GUARD) : les décorateurs
 * @Public(), @Roles() et @CurrentUser() de infrastructure/auth servent à tous les modules.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TypeOrmUserEntity]),
    JwtModule.register({
      secret: jwtSecret(),
      signOptions: { expiresIn: TOKEN_TTL_SECONDS },
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    RegisterUserUseCase,
    LoginUserUseCase,
    RefreshTokenUseCase,
    AuthenticateUseCase,
    GetUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    ChangePasswordUseCase,
    DeleteUserUseCase,
    { provide: USER_REPOSITORY, useClass: TypeormUserRepository },
    { provide: PASSWORD_HASHER, useClass: ScryptPasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class UsersModule {}
