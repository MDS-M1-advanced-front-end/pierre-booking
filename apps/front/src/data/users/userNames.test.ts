import type { User } from '@room-booking/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearUsersCache, getUsersByIds } from './userNames';
import { getUser } from './users.queries';

vi.mock('./users.queries', () => ({ getUser: vi.fn() }));

const user = (id: string, firstName: string): User => ({
  id,
  firstName,
  lastName: 'Martin',
  email: `${id}@example.com`,
  role: 'CLIENT',
});

beforeEach(() => {
  clearUsersCache();
  vi.mocked(getUser).mockReset();
});

describe('getUsersByIds', () => {
  it('appelle getUser une seule fois par identifiant distinct', async () => {
    vi.mocked(getUser).mockImplementation((id) =>
      Promise.resolve({ ok: true, data: user(id, id === 'u1' ? 'Léa' : 'Hugo') }),
    );

    const users = await getUsersByIds(['u1', 'u2', 'u1']);

    expect(getUser).toHaveBeenCalledTimes(2);
    expect(users.get('u1')?.firstName).toBe('Léa');
    expect(users.get('u2')?.firstName).toBe('Hugo');
  });

  it('garde les résultats en cache le temps de la page', async () => {
    vi.mocked(getUser).mockResolvedValue({ ok: true, data: user('u1', 'Léa') });

    await getUsersByIds(['u1']);
    await getUsersByIds(['u1']);

    expect(getUser).toHaveBeenCalledOnce();
  });

  it('laisse absent un utilisateur en erreur (403) et le retente plus tard', async () => {
    vi.mocked(getUser).mockResolvedValue({
      ok: false,
      error: { status: 403, code: 'FORBIDDEN', message: 'x' },
    });

    const users = await getUsersByIds(['u1']);
    expect(users.has('u1')).toBe(false);

    await getUsersByIds(['u1']);
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it("n'appelle rien pour une liste vide", async () => {
    expect((await getUsersByIds([])).size).toBe(0);
    expect(getUser).not.toHaveBeenCalled();
  });
});
