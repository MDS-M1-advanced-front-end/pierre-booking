import { Inject, Injectable } from '@nestjs/common';
import { User, UserRole } from '../../domain/entities/user.entity.js';
import {
  USER_REPOSITORY,
  type UserRepositoryInterface,
} from '../../domain/repositories/user.repository.interface.js';
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '../ports/password-hasher.port.js';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  // Un compte créé par inscription est toujours CLIENT
  async execute(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ): Promise<User> {
    const user = new User({
      firstName,
      lastName,
      email,
      passwordHash: await this.passwordHasher.hash(password),
      role: UserRole.CLIENT,
    });
    return this.userRepository.save(user);
  }
}
