import { Inject, Injectable } from '@nestjs/common';
import type { User } from '../../domain/entities/user.entity';
import { InvalidRefreshTokenException } from '../../domain/exceptions/user-domain.exception';
import {
  USER_REPOSITORY,
  type UserRepositoryInterface,
} from '../../domain/repositories/user.repository.interface';
import {
  TOKEN_SERVICE,
  type IssuedToken,
  type TokenPort,
} from '../ports/token.port';
import { isRevoked } from '../token-revocation';

/**
 * Renouvelle les jetons à partir d'un jeton de rafraîchissement (POST /auth/refresh).
 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenPort,
  ) {}

  /**
   * Utilisateur relu en base : un compte supprimé ne peut plus rafraîchir. Un nouveau jeton
   * de rafraîchissement est émis à chaque appel, mais l'ancien reste valable jusqu'à son
   * expiration (aucun jeton n'est stocké, donc aucun ne peut être révoqué).
   * @param refreshToken - Jeton de rafraîchissement remis à la connexion.
   * @returns Le jeton d'accès (`short`), le jeton de rafraîchissement (`long`) et l'utilisateur.
   * @throws {InvalidRefreshTokenException} si le jeton est invalide, expiré ou si le compte n'existe plus.
   */
  async execute(
    refreshToken: string,
  ): Promise<{ short: IssuedToken; long: IssuedToken } & { user: User }> {
    const payload = await this.tokens.verifyRefresh(refreshToken);
    const user = payload
      ? await this.userRepository.findById(payload.userId)
      : null;
    if (!user || !user.id) throw new InvalidRefreshTokenException();
    // Jeton de rafraîchissement émis avant le dernier changement de mot de passe : révoqué
    if (payload && isRevoked(payload.issuedAt, user.passwordChangedAt)) {
      throw new InvalidRefreshTokenException();
    }
    return {
      short: await this.tokens.issue(user.id),
      long: await this.tokens.issueRefresh(user.id),
      user,
    };
  }
}
