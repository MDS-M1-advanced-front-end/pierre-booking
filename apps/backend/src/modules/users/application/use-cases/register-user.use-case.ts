import { Inject, Injectable } from '@nestjs/common';
import { User, UserRole } from '../../domain/entities/user.entity';
import {
  USER_REPOSITORY,
  type UserRepositoryInterface,
} from '../../domain/repositories/user.repository.interface';
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '../ports/password-hasher.port';

/**
 * Crée un compte (POST /auth/register).
 */
@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  /**
   * Un compte créé par inscription est toujours CLIENT.
   * @param firstName - Prénom.
   * @param lastName - Nom.
   * @param email - E-mail, normalisé avant l'enregistrement.
   * @param password - Mot de passe en clair, haché avant l'enregistrement.
   * @returns L'utilisateur créé.
   * @throws {EmailAlreadyUsedException} si l'e-mail est déjà utilisé.
   */
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
