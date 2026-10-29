import { Inject, Injectable } from '@nestjs/common';
import type { User, UserRole } from '../../domain/entities/user.entity';
import {
  USER_REPOSITORY,
  type UserRepositoryInterface,
} from '../../domain/repositories/user.repository.interface';

/**
 * Liste paginée des utilisateurs (GET /users, administrateurs).
 */
@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
  ) {}

  /**
   * @param criteria - Rôle (facultatif), page (à partir de 1) et taille de page.
   * @returns Les utilisateurs de la page et le nombre total.
   */
  execute(criteria: {
    role?: UserRole;
    page: number;
    pageSize: number;
  }): Promise<{ items: User[]; total: number }> {
    return this.userRepository.findPage(criteria);
  }
}
