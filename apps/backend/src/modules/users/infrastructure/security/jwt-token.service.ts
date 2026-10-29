import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  IssuedToken,
  TokenPort,
} from '../../application/ports/token.port.js';

/**
 * Durée de vie d'un jeton d'accès, en secondes (15 min).
 */
export const TOKEN_TTL_SECONDS = 15 * 60;

/**
 * Durée de vie d'un jeton de rafraîchissement, en secondes (7 jours).
 */
export const TOKEN_TTL_LONG_SECONDS = 7 * 24 * 60 * 60;

/**
 * Secret de signature des jetons, lu dans JWT_SECRET.
 * @returns Le secret ; `dev-secret` hors production.
 * @throws {Error} en production sans JWT_SECRET : le back refuse de démarrer.
 */
export function jwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET est obligatoire en production');
  }
  return 'dev-secret';
}

/**
 * Secret de signature des jetons de rafraîchissement, lu dans JWT_REFRESH_SECRET.
 * Distinct de JWT_SECRET : sinon le guard accepterait un jeton de rafraîchissement
 * comme jeton d'accès, valable 7 jours.
 * @returns Le secret ; `dev-refresh-secret` hors production.
 * @throws {Error} en production sans JWT_REFRESH_SECRET, au premier jeton émis ou vérifié.
 */
export function jwtRefreshSecret(): string {
  if (process.env.JWT_REFRESH_SECRET) return process.env.JWT_REFRESH_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_REFRESH_SECRET est obligatoire en production');
  }
  return 'dev-refresh-secret';
}

/**
 * Implémentation JWT de TokenPort (@nestjs/jwt). Le jeton ne porte que l'identifiant :
 * le rôle est relu en base à chaque appel.
 */
@Injectable()
export class JwtTokenService implements TokenPort {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * @param userId - UUID de l'utilisateur.
   * @returns Le jeton signé et sa durée de vie.
   */
  async issue(userId: string): Promise<IssuedToken> {
    const accessToken = await this.jwtService.signAsync({ sub: userId });
    return { accessToken, expiresIn: TOKEN_TTL_SECONDS };
  }

  /**
   * @param userId - UUID de l'utilisateur.
   * @returns Le jeton de rafraîchissement signé et sa durée de vie.
   */
  async issueRefresh(userId: string): Promise<IssuedToken> {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId },
      { secret: jwtRefreshSecret(), expiresIn: TOKEN_TTL_LONG_SECONDS },
    );
    return { accessToken, expiresIn: TOKEN_TTL_LONG_SECONDS };
  }

  /**
   * @param token - Jeton reçu.
   * @returns L'identifiant de l'utilisateur, ou `null` si la signature ou la date d'expiration est invalide.
   */
  async verify(token: string): Promise<string | null> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      return payload.sub;
    } catch {
      return null;
    }
  }

  /**
   * @param token - Jeton de rafraîchissement reçu.
   * @returns L'identifiant de l'utilisateur, ou `null` si la signature ou la date d'expiration est invalide.
   */
  async verifyRefresh(token: string): Promise<string | null> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        token,
        { secret: jwtRefreshSecret() },
      );
      return payload.sub;
    } catch {
      return null;
    }
  }
}
