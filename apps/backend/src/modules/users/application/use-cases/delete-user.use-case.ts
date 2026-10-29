import { Inject, Injectable } from '@nestjs/common';
import { UserNotFoundException } from '../../domain/exceptions/user-domain.exception';
import {
  USER_REPOSITORY,
  type UserRepositoryInterface,
} from '../../domain/repositories/user.repository.interface';

/**
 * Supprime un utilisateur (DELETE /users/{userId}, administrateurs).
 */
@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
  ) {}

  /**
   * @param userId - UUID de l'utilisateur à supprimer.
   * @throws {UserNotFoundException} si l'utilisateur n'existe pas.
   * @throws {UserHasReservationsException} si des réservations lui sont rattachées.
   */
  async execute(userId: string): Promise<void> {
    if (!(await this.userRepository.findById(userId))) {
      throw new UserNotFoundException();
    }
    // UserHasReservationsException (409) si des réservations lui sont rattachées
    await this.userRepository.delete(userId);
  }
}
