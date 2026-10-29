import { Inject, Injectable } from '@nestjs/common';
import type { User } from '../../domain/entities/user.entity.js';
import {
  USER_REPOSITORY,
  type UserRepositoryInterface,
} from '../../domain/repositories/user.repository.interface.js';
import { TOKEN_SERVICE, type TokenPort } from '../ports/token.port.js';
import { isRevoked } from '../token-revocation.js';

/**
 * Identifie l'utilisateur d'un jeton d'accès, pour le guard global.
 */
@Injectable()
export class AuthenticateUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenPort,
  ) {}

  /**
   * Utilisateur relu en base à chaque appel : un changement de rôle ou une suppression
   * s'applique sans attendre l'expiration du jeton.
   * @param token - Jeton reçu dans l'en-tête Authorization.
   * @returns L'utilisateur, ou `null` si le jeton est invalide ou si le compte n'existe plus.
   */
  async execute(token: string): Promise<User | null> {
    const payload = await this.tokens.verify(token);
    if (!payload) return null;
    const user = await this.userRepository.findById(payload.userId);
    if (!user) return null;
    // Jeton émis avant le dernier changement de mot de passe : révoqué
    if (isRevoked(payload.issuedAt, user.passwordChangedAt)) return null;
    return user;
  }
}
