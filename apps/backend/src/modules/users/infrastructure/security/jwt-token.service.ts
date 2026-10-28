import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  IssuedToken,
  TokenPort,
} from '../../application/ports/token.port.js';

/**
 * Durée de vie d'un jeton d'accès, en secondes (pas de jeton de rafraîchissement).
 */
export const TOKEN_TTL_SECONDS = 3600;

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
}
