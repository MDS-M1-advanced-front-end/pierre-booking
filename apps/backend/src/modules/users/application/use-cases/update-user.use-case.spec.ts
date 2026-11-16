import { User, UserRole } from '../../domain/entities/user.entity';
import { SelfAdministrationException } from '../../domain/exceptions/user-domain.exception';
import type { UserRepositoryInterface } from '../../domain/repositories/user.repository.interface';
import { UpdateUserUseCase } from './update-user.use-case';

const admin = () =>
  new User({
    id: 'admin-1',
    firstName: 'Karim',
    lastName: 'Admin',
    email: 'karim@exemple.fr',
    passwordHash: 'hash',
    role: UserRole.ADMINISTRATEUR,
  });

const setup = (found: User) => {
  const save = vi.fn((u: User) => Promise.resolve(u));
  const users = {
    findById: () => Promise.resolve(found),
    save,
  } as unknown as UserRepositoryInterface;
  return { save, useCase: new UpdateUserUseCase(users) };
};

describe('UpdateUserUseCase', () => {
  it('refuse qu’un administrateur change son propre rôle', async () => {
    const { useCase, save } = setup(admin());
    await expect(
      useCase.execute('admin-1', { role: UserRole.CLIENT }, 'admin-1'),
    ).rejects.toBeInstanceOf(SelfAdministrationException);
    expect(save).not.toHaveBeenCalled();
  });

  it('laisse un administrateur modifier son profil sans changer de rôle', async () => {
    const { useCase } = setup(admin());
    const user = await useCase.execute(
      'admin-1',
      { firstName: 'Karima', role: UserRole.ADMINISTRATEUR },
      'admin-1',
    );
    expect(user.firstName).toBe('Karima');
  });

  it('change le rôle d’un autre utilisateur', async () => {
    const { useCase } = setup(admin());
    const user = await useCase.execute(
      'admin-1',
      { role: UserRole.GESTIONNAIRE },
      'admin-2',
    );
    expect(user.role).toBe(UserRole.GESTIONNAIRE);
  });
});
