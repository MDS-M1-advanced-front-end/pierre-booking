import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../client';
import { changePassword, login, logout, register } from './auth.queries';
import { clearSession, expireSession, saveSession, session } from './session.svelte';

vi.mock('../client', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  changePassword: vi.fn(),
}));
vi.mock('./session.svelte', () => ({
  saveSession: vi.fn(),
  clearSession: vi.fn(),
  updateSessionUser: vi.fn(),
  expireSession: vi.fn(),
  session: { user: null },
}));

const user = {
  id: 'u1',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'lea@exemple.fr',
  role: 'CLIENT' as const,
  createdAt: '2026-02-11T09:00:00Z',
};
const auth = { accessToken: 't', expiresIn: 3600, user };
const body = {
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'lea@exemple.fr',
  password: 'secret123',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('login', () => {
  it('enregistre la session en cas de succès', async () => {
    vi.mocked(api.login).mockResolvedValue({ ok: true, data: auth });
    expect(await login({ email: body.email, password: body.password })).toEqual({
      ok: true,
      data: auth,
    });
    expect(saveSession).toHaveBeenCalledWith(auth);
  });

  it('ne touche pas la session sur un 401 (identifiants incorrects)', async () => {
    const error = { status: 401, code: 'UNAUTHORIZED', message: 'x' };
    vi.mocked(api.login).mockResolvedValue({ ok: false, error });
    expect(await login({ email: body.email, password: 'mauvais' })).toEqual({ ok: false, error });
    expect(saveSession).not.toHaveBeenCalled();
    expect(clearSession).not.toHaveBeenCalled();
  });
});

describe('register', () => {
  it('se connecte avec les mêmes identifiants après la création', async () => {
    vi.mocked(api.register).mockResolvedValue({ ok: true, data: user });
    vi.mocked(api.login).mockResolvedValue({ ok: true, data: auth });
    expect(await register(body)).toEqual({ ok: true, data: auth });
    expect(api.login).toHaveBeenCalledWith({ email: body.email, password: body.password });
    expect(saveSession).toHaveBeenCalledWith(auth);
  });

  it("ne se connecte pas si l'inscription échoue", async () => {
    const error = { status: 409, code: 'CONFLICT', message: 'x' };
    vi.mocked(api.register).mockResolvedValue({ ok: false, error });
    expect(await register(body)).toEqual({ ok: false, error });
    expect(api.login).not.toHaveBeenCalled();
  });
});

describe('logout', () => {
  it('supprime le jeton et la session', () => {
    logout();
    expect(api.logout).toHaveBeenCalledOnce();
    expect(clearSession).toHaveBeenCalledOnce();
  });
});

describe('changePassword', () => {
  const passwords = { currentPassword: 'ancien123', newPassword: 'nouveau123' };

  beforeEach(() => {
    session.user = user;
  });

  it('se reconnecte avec le nouveau mot de passe (le back révoque les anciens jetons)', async () => {
    vi.mocked(api.changePassword).mockResolvedValue({ ok: true, data: undefined });
    vi.mocked(api.login).mockResolvedValue({ ok: true, data: auth });
    expect(await changePassword(passwords)).toEqual({ ok: true, data: undefined });
    expect(api.login).toHaveBeenCalledWith({ email: user.email, password: 'nouveau123' });
    expect(saveSession).toHaveBeenCalledWith(auth);
    expect(expireSession).not.toHaveBeenCalled();
  });

  it('expire la session si la reconnexion échoue', async () => {
    vi.mocked(api.changePassword).mockResolvedValue({ ok: true, data: undefined });
    vi.mocked(api.login).mockResolvedValue({
      ok: false,
      error: { status: 0, code: 'NETWORK_ERROR', message: 'x' },
    });
    expect((await changePassword(passwords)).ok).toBe(true);
    expect(expireSession).toHaveBeenCalled();
  });

  it('ne se reconnecte pas si le changement échoue', async () => {
    const error = { status: 400, code: 'VALIDATION_ERROR', message: 'x' };
    vi.mocked(api.changePassword).mockResolvedValue({ ok: false, error });
    expect(await changePassword(passwords)).toEqual({ ok: false, error });
    expect(api.login).not.toHaveBeenCalled();
  });
});
