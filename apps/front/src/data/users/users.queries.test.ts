import type { ProfileUpdateRequest } from '@room-booking/core';
import { describe, expect, it, vi } from 'vitest';
import * as api from '../client';
import { expireSession } from '../auth/session.svelte';
import { updateProfile } from './users.queries';

vi.mock('../client', () => ({ updateMe: vi.fn() }));
vi.mock('../auth/session.svelte', () => ({
  ensureFreshSession: vi.fn(),
  refreshSession: vi.fn().mockResolvedValue('rejected'),
  expireSession: vi.fn(),
}));

const user = {
  id: 'u1',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'client1@salles.example',
  role: 'CLIENT' as const,
  createdAt: '2026-02-11T09:00:00Z',
};

describe('updateProfile', () => {
  it("passe par PATCH /auth/me et n'envoie jamais role (anomalie 7)", async () => {
    vi.mocked(api.updateMe).mockResolvedValue({ ok: true, data: user });
    // `role` glissé à l'exécution (le type ne l'accepte pas)
    const body = { firstName: 'Léa', role: 'ADMINISTRATEUR' } as ProfileUpdateRequest;
    await updateProfile(body);
    expect(api.updateMe).toHaveBeenCalledWith({ firstName: 'Léa' });
    const sent = vi.mocked(api.updateMe).mock.calls[0]?.[0];
    expect(sent).not.toHaveProperty('role');
  });

  it('vide la session et renvoie vers la connexion sur un 401', async () => {
    vi.mocked(api.updateMe).mockResolvedValue({
      ok: false,
      error: { status: 401, code: 'UNAUTHORIZED', message: 'x' },
    });
    await updateProfile({ lastName: 'Martin' });
    expect(expireSession).toHaveBeenCalledOnce();
  });
});
