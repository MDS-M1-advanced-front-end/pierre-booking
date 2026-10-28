import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity.js';
import { InvalidCredentialsException } from '../../domain/exceptions/user-domain.exception.js';
import {
  USER_REPOSITORY,
  type UserRepositoryInterface,
} from '../../domain/repositories/user.repository.interface.js';
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '../ports/password-hasher.port.js';
import {
  TOKEN_SERVICE,
  type IssuedToken,
  type TokenPort,
} from '../ports/token.port.js';

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenPort,
  ) {}

  async execute(
    email: string,
    password: string,
  ): Promise<IssuedToken & { user: User }> {
    const user = await this.userRepository.findByEmail(
      User.normalizeEmail(email),
    );
    // Même erreur si l'e-mail est inconnu ou le mot de passe faux
    if (
      !user ||
      !(await this.passwordHasher.verify(password, user.passwordHash))
    ) {
      throw new InvalidCredentialsException();
    }
    return { ...(await this.tokens.issue(user.id!)), user };
  }
}
