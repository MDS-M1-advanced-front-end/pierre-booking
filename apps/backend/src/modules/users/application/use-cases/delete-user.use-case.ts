import { Inject, Injectable } from '@nestjs/common';
import { UserNotFoundException } from '../../domain/exceptions/user-domain.exception.js';
import {
  USER_REPOSITORY,
  type UserRepositoryInterface,
} from '../../domain/repositories/user.repository.interface.js';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
  ) {}

  async execute(userId: string): Promise<void> {
    if (!(await this.userRepository.findById(userId))) {
      throw new UserNotFoundException();
    }
    // UserHasReservationsException (409) si des réservations lui sont rattachées
    await this.userRepository.delete(userId);
  }
}
