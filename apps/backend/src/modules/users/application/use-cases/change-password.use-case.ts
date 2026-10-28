import { Inject, Injectable } from '@nestjs/common';
import {
  UserNotFoundException,
  WrongCurrentPasswordException,
} from '../../domain/exceptions/user-domain.exception.js';
import {
  USER_REPOSITORY,
  type UserRepositoryInterface,
} from '../../domain/repositories/user.repository.interface.js';
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '../ports/password-hasher.port.js';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UserNotFoundException();
    if (
      !(await this.passwordHasher.verify(currentPassword, user.passwordHash))
    ) {
      throw new WrongCurrentPasswordException();
    }
    user.passwordHash = await this.passwordHasher.hash(newPassword);
    await this.userRepository.save(user);
  }
}
