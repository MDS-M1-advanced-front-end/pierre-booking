import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  IssuedToken,
  TokenPort,
} from '../../application/ports/token.port.js';

export const TOKEN_TTL_SECONDS = 3600;

export function jwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET est obligatoire en production');
  }
  return 'dev-secret';
}

@Injectable()
export class JwtTokenService implements TokenPort {
  constructor(private readonly jwtService: JwtService) {}

  async issue(userId: string): Promise<IssuedToken> {
    const accessToken = await this.jwtService.signAsync({ sub: userId });
    return { accessToken, expiresIn: TOKEN_TTL_SECONDS };
  }

  async verify(token: string): Promise<string | null> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      return payload.sub;
    } catch {
      return null;
    }
  }
}
