import type { UserUpdateRequest } from '@room-booking/core';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../client';
import { expireSession } from '../auth/session.svelte';
import { updateUser } from './users.queries';

vi.mock('../client', () => ({ updateUser: vi.fn() }));
vi.mock('../auth/session.svelte', () => ({ expireSession: vi.fn() }));

const user = {
  id: 'u1',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'client1@salles.example',
  role: 'CLIENT' as const,
  createdAt: '2026-02-11T09:00:00Z',
};

describe('updateUser', () => {
  it("n'envoie jamais role (anomalie 7)", async () => {
    vi.mocked(api.updateUser).mockResolvedValue({ ok: true, data: user });
    const body: UserUpdateRequest = { firstName: 'Léa', role: 'ADMINISTRATEUR' };
    await updateUser('u1', body);
    expect(api.updateUser).toHaveBeenCalledWith('u1', { firstName: 'Léa' });
    const sent = vi.mocked(api.updateUser).mock.calls[0]?.[1];
    expect(sent).not.toHaveProperty('role');
  });

  it('vide la session et renvoie vers la connexion sur un 401', async () => {
    vi.mocked(api.updateUser).mockResolvedValue({
      ok: false,
      error: { status: 401, code: 'UNAUTHORIZED', message: 'x' },
    });
    await updateUser('u1', { lastName: 'Martin' });
    expect(expireSession).toHaveBeenCalledOnce();
  });
});
