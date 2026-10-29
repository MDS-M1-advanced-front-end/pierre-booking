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

/**
 * Hash factice, au bon format, vérifié quand l'e-mail est inconnu : le mot de passe est toujours
 * haché, connu ou non, pour que la réponse prenne le même temps (pas d'énumération des comptes
 * par le temps de réponse). La vérification échoue toujours.
 */
const DUMMY_PASSWORD_HASH =
  'b93a2d39a3b4070766071bd75792e6be:9ab3416d3d4fe3deed84b75611b29d2d4161aa32be9a41c127ed1f9a330a2f46e3372071b18f0b6a092f4fb0b205f838d3a43f5a3bc0234c3fc56cc6afa6b7f9';

/**
 * Connecte un utilisateur (POST /auth/login).
 */
@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenPort,
  ) {}

  /**
   * @param email - E-mail saisi, quelle que soit sa casse.
   * @param password - Mot de passe en clair.
   * @returns Le jeton d'accès (`short`), le jeton de rafraîchissement (`long`) et l'utilisateur.
   * @throws {InvalidCredentialsException} si l'e-mail est inconnu ou le mot de passe faux.
   */
  async execute(
    email: string,
    password: string,
  ): Promise<{ short: IssuedToken; long: IssuedToken } & { user: User }> {
    const user = await this.userRepository.findByEmail(
      User.normalizeEmail(email),
    );
    // Toujours hacher, même sans compte : la réponse prend le même temps dans les deux cas.
    const passwordOk = await this.passwordHasher.verify(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    // Même erreur si l'e-mail est inconnu ou le mot de passe faux
    if (!user || !user.id || !passwordOk) {
      throw new InvalidCredentialsException();
    }
    return {
      short: await this.tokens.issue(user.id),
      long: await this.tokens.issueRefresh(user.id),
      user,
    };
  }
}
