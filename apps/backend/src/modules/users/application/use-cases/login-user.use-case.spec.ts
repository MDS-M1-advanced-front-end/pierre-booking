import { User, UserRole } from '../../domain/entities/user.entity';
import { InvalidCredentialsException } from '../../domain/exceptions/user-domain.exception';
import type { UserRepositoryInterface } from '../../domain/repositories/user.repository.interface';
import type {
  PasswordCheck,
  PasswordHasherPort,
} from '../ports/password-hasher.port';
import type { TokenPort } from '../ports/token.port';
import { LoginUserUseCase } from './login-user.use-case';

const user = () =>
  new User({
    id: 'u1',
    firstName: 'Léa',
    lastName: 'Martin',
    email: 'lea@exemple.fr',
    passwordHash: 'ancien-hash',
    role: UserRole.CLIENT,
  });

const setup = (check: PasswordCheck, found: User | null = user()) => {
  const users = {
    findByEmail: vi.fn(() => Promise.resolve(found)),
    save: vi.fn((u: User) => Promise.resolve(u)),
  } as unknown as UserRepositoryInterface;
  const hasher: PasswordHasherPort = {
    hash: vi.fn(() => Promise.resolve('nouveau-hash')),
    verify: vi.fn(() => Promise.resolve(check)),
  };
  const tokens = {
    issue: () => Promise.resolve({ accessToken: 'court', expiresIn: 3600 }),
    issueRefresh: () =>
      Promise.resolve({ accessToken: 'long', expiresIn: 604800 }),
  } as unknown as TokenPort;
  return {
    users,
    hasher,
    useCase: new LoginUserUseCase(users, hasher, tokens),
  };
};

describe('LoginUserUseCase', () => {
  it('connecte sans re-hacher un mot de passe au format actuel', async () => {
    const { useCase, users } = setup('valid');
    const result = await useCase.execute('Lea@Exemple.fr', 'motdepasse');
    expect(result.short.accessToken).toBe('court');
    expect(users.save).not.toHaveBeenCalled();
  });

  it('re-hache un mot de passe de l’ancien format (avant le poivre)', async () => {
    const { useCase, users, hasher } = setup('outdated');
    await useCase.execute('lea@exemple.fr', 'motdepasse');
    expect(hasher.hash).toHaveBeenCalledWith('motdepasse');
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'nouveau-hash' }),
    );
  });

  it('refuse un mot de passe faux', async () => {
    const { useCase, users } = setup('invalid');
    await expect(useCase.execute('lea@exemple.fr', 'faux')).rejects.toThrow(
      InvalidCredentialsException,
    );
    expect(users.save).not.toHaveBeenCalled();
  });

  it('hache quand même pour un e-mail inconnu, puis refuse', async () => {
    const { useCase, hasher } = setup('invalid', null);
    await expect(
      useCase.execute('inconnu@exemple.fr', 'motdepasse'),
    ).rejects.toThrow(InvalidCredentialsException);
    expect(hasher.verify).toHaveBeenCalled();
  });
});
