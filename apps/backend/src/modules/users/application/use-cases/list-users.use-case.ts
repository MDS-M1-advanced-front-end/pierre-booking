import { Inject, Injectable } from '@nestjs/common';
import type { User, UserRole } from '../../domain/entities/user.entity.js';
import {
  USER_REPOSITORY,
  type UserRepositoryInterface,
} from '../../domain/repositories/user.repository.interface.js';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
  ) {}

  execute(criteria: {
    role?: UserRole;
    page: number;
    pageSize: number;
  }): Promise<{ items: User[]; total: number }> {
    return this.userRepository.findPage(criteria);
  }
}
