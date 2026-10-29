import { Inject, Injectable } from '@nestjs/common';
import {
  UserNotFoundException,
  WrongCurrentPasswordException,
} from '../../domain/exceptions/user-domain.exception';
import {
  USER_REPOSITORY,
  type UserRepositoryInterface,
} from '../../domain/repositories/user.repository.interface';
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '../ports/password-hasher.port';

/**
 * Change le mot de passe de l'utilisateur connecté (PATCH /auth/password).
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  /**
   * L'ancien mot de passe est exigé.
   * @param userId - UUID de l'utilisateur connecté.
   * @param currentPassword - Mot de passe actuel, vérifié avant la modification.
   * @param newPassword - Nouveau mot de passe (8 caractères minimum, contrôlé par le DTO).
   * @throws {UserNotFoundException} si le compte n'existe plus.
   * @throws {WrongCurrentPasswordException} si le mot de passe actuel est faux.
   */
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
    // Révoque les jetons (accès et rafraîchissement) émis avant ce changement
    user.markPasswordChanged();
    await this.userRepository.save(user);
  }
}
