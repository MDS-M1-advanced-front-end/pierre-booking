import { Inject, Injectable } from '@nestjs/common';
import type {
  User,
  UserProfileChanges,
  UserRole,
} from '../../domain/entities/user.entity';
import { UserNotFoundException } from '../../domain/exceptions/user-domain.exception';
import {
  USER_REPOSITORY,
  type UserRepositoryInterface,
} from '../../domain/repositories/user.repository.interface';

/**
 * Modifie un utilisateur : PATCH /auth/me (sans rôle) et PATCH /users/{userId}
 * (administrateurs, rôle compris).
 */
@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
  ) {}

  /**
   * @param userId - UUID de l'utilisateur.
   * @param changes - Champs à modifier ; un champ absent est conservé. Le controller de
   *   PATCH /auth/me ne transmet jamais `role`.
   * @returns L'utilisateur modifié.
   * @throws {UserNotFoundException} si l'utilisateur n'existe pas.
   * @throws {EmailAlreadyUsedException} si le nouvel e-mail est pris.
   */
  async execute(
    userId: string,
    changes: UserProfileChanges & { role?: UserRole },
  ): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UserNotFoundException();
    user.changeProfile(changes);
    if (changes.role !== undefined) user.changeRole(changes.role);
    return this.userRepository.save(user);
  }
}
