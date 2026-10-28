import { Inject, Injectable } from '@nestjs/common';
import type {
  User,
  UserProfileChanges,
  UserRole,
} from '../../domain/entities/user.entity.js';
import { UserNotFoundException } from '../../domain/exceptions/user-domain.exception.js';
import {
  USER_REPOSITORY,
  type UserRepositoryInterface,
} from '../../domain/repositories/user.repository.interface.js';

// PATCH /auth/me (sans rôle) et PATCH /users/{userId} (administrateurs, rôle compris)
@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
  ) {}

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
