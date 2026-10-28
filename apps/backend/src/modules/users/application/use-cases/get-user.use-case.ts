import { Inject, Injectable } from '@nestjs/common';
import type { User } from '../../domain/entities/user.entity.js';
import { UserNotFoundException } from '../../domain/exceptions/user-domain.exception.js';
import {
  USER_REPOSITORY,
  type UserRepositoryInterface,
} from '../../domain/repositories/user.repository.interface.js';

/**
 * Lit un utilisateur : GET /auth/me (utilisateur connecté) et GET /users/{userId} (administrateurs).
 */
@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
  ) {}

  /**
   * @param userId - UUID de l'utilisateur.
   * @returns L'utilisateur.
   * @throws {UserNotFoundException} si l'utilisateur n'existe pas.
   */
  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UserNotFoundException();
    return user;
  }
}
