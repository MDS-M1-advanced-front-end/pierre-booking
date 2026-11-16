import { randomBytes, scryptSync } from 'node:crypto';
import { ScryptPasswordHasher } from './scrypt-password-hasher';

const hasher = new ScryptPasswordHasher();

/** Hash de l'ancien format, avant le poivre : "<sel>:scrypt(mot de passe, sel)". */
const legacyHash = (password: string) => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};

describe('ScryptPasswordHasher', () => {
  it('vérifie un mot de passe haché au format actuel', async () => {
    const stored = await hasher.hash('motdepasse');
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(await hasher.verify('motdepasse', stored)).toBe('valid');
    expect(await hasher.verify('autre', stored)).toBe('invalid');
  });

  it('sale chaque hash différemment', async () => {
    expect(await hasher.hash('motdepasse')).not.toBe(
      await hasher.hash('motdepasse'),
    );
  });

  it('accepte un hash de l’ancien format, à re-hacher', async () => {
    const stored = legacyHash('motdepasse');
    expect(await hasher.verify('motdepasse', stored)).toBe('outdated');
    expect(await hasher.verify('autre', stored)).toBe('invalid');
  });

  it('refuse un hash créé avec un autre poivre', async () => {
    const stored = await hasher.hash('motdepasse');
    const previous = process.env.PEPPER_SECRET;
    process.env.PEPPER_SECRET = 'un-autre-poivre-assez-long';
    try {
      expect(await hasher.verify('motdepasse', stored)).toBe('invalid');
    } finally {
      if (previous === undefined) delete process.env.PEPPER_SECRET;
      else process.env.PEPPER_SECRET = previous;
    }
  });

  it.each(['', 'sansdeuxpoints', 'abcd:1234', ':'])(
    'renvoie invalid pour une valeur stockée mal formée (%j)',
    async (stored) => {
      expect(await hasher.verify('motdepasse', stored)).toBe('invalid');
    },
  );
});
