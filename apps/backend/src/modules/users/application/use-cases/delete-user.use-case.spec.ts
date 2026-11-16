import { User, UserRole } from '../../domain/entities/user.entity';
import {
  SelfAdministrationException,
  UserNotFoundException,
} from '../../domain/exceptions/user-domain.exception';
import type { UserRepositoryInterface } from '../../domain/repositories/user.repository.interface';
import { DeleteUserUseCase } from './delete-user.use-case';

const client = new User({
  id: 'u1',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'lea@exemple.fr',
  passwordHash: 'hash',
  role: UserRole.CLIENT,
});

const setup = (found: User | null) => {
  const remove = vi.fn(() => Promise.resolve());
  const users = {
    findById: () => Promise.resolve(found),
    delete: remove,
  } as unknown as UserRepositoryInterface;
  return { remove, useCase: new DeleteUserUseCase(users) };
};

describe('DeleteUserUseCase', () => {
  it('refuse qu’un administrateur supprime son propre compte', async () => {
    const { useCase, remove } = setup(client);
    await expect(useCase.execute('u1', 'u1')).rejects.toBeInstanceOf(
      SelfAdministrationException,
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it('supprime un autre utilisateur', async () => {
    const { useCase, remove } = setup(client);
    await useCase.execute('u1', 'admin-1');
    expect(remove).toHaveBeenCalledWith('u1');
  });

  it('signale un utilisateur introuvable', async () => {
    const { useCase } = setup(null);
    await expect(useCase.execute('u1', 'admin-1')).rejects.toBeInstanceOf(
      UserNotFoundException,
    );
  });
});
