import { Inject, Injectable } from '@nestjs/common';
import type { User } from '../../domain/entities/user.entity.js';
import {
  USER_REPOSITORY,
  type UserRepositoryInterface,
} from '../../domain/repositories/user.repository.interface.js';
import { TOKEN_SERVICE, type TokenPort } from '../ports/token.port.js';

@Injectable()
export class AuthenticateUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenPort,
  ) {}

  // Utilisateur relu en base à chaque appel : un changement de rôle ou une suppression
  // s'applique sans attendre l'expiration du jeton
  async execute(token: string): Promise<User | null> {
    const userId = await this.tokens.verify(token);
    return userId ? this.userRepository.findById(userId) : null;
  }
}
