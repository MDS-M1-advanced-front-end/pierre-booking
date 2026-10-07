import type { AuthResponse, User } from '@room-booking/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { setAccessToken } = vi.hoisted(() => {
  // Le projet `front:data` ne compile pas les runes Svelte : on remplace `$state` par
  // l'identité. La réactivité n'est pas testée ici, seulement la logique.
  (globalThis as Record<string, unknown>).$state = <T>(value: T): T => value;
  return { setAccessToken: vi.fn() };
});

vi.mock('../client', () => ({ setAccessToken }));

const {
  SESSION_KEY,
  clearSession,
  expireSession,
  hasRole,
  restoreSession,
  saveSession,
  session,
  updateSessionUser,
} = await import('./session.svelte');

const lea: User = {
  id: 'u-1',
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'lea.martin@example.com',
  role: 'CLIENT',
};

const auth: AuthResponse = { accessToken: 'jeton-1', expiresIn: 3600, user: lea };

function readStored(): unknown {
  return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
}

const NOW = new Date('2026-11-16T10:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  localStorage.clear();
  session.user = null;
  setAccessToken.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('saveSession', () => {
  it('enregistre le jeton, l’utilisateur et la date d’expiration', () => {
    saveSession(auth);

    expect(readStored()).toEqual({
      accessToken: 'jeton-1',
      user: lea,
      expiresAt: NOW.getTime() + 3600 * 1000,
    });
    expect(setAccessToken).toHaveBeenCalledWith('jeton-1');
    expect(session.user).toEqual(lea);
  });

  it('prend une heure par défaut si `expiresIn` est absent', () => {
    saveSession({ accessToken: 'jeton-2', user: lea });
    const stored = readStored() as { expiresAt: number };
    expect(stored.expiresAt).toBe(NOW.getTime() + 3600 * 1000);
  });
});

describe('restoreSession', () => {
  it('relit une session valide et rend le jeton au client', () => {
    saveSession(auth);
    session.user = null;
    setAccessToken.mockClear();

    expect(restoreSession()).toEqual(lea);
    expect(session.user).toEqual(lea);
    expect(setAccessToken).toHaveBeenCalledWith('jeton-1');
  });

  it('renvoie null sans session', () => {
    expect(restoreSession()).toBeNull();
    expect(session.user).toBeNull();
  });

  it('efface une session expirée', () => {
    saveSession(auth);
    vi.advanceTimersByTime(3600 * 1000);
    setAccessToken.mockClear();

    expect(restoreSession()).toBeNull();
    expect(session.user).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(setAccessToken).toHaveBeenCalledWith(null);
  });

  it('garde une session encore valide une seconde avant l’expiration', () => {
    saveSession(auth);
    vi.advanceTimersByTime(3599 * 1000);
    expect(restoreSession()).toEqual(lea);
  });

  it.each([
    ['du JSON invalide', '{pas du json'],
    ['une valeur nulle', 'null'],
    ['un jeton manquant', JSON.stringify({ user: lea, expiresAt: NOW.getTime() + 1000 })],
    [
      'un utilisateur incomplet',
      JSON.stringify({ accessToken: 'x', user: { id: 'u-1' }, expiresAt: NOW.getTime() + 1000 }),
    ],
    [
      'une date non numérique',
      JSON.stringify({ accessToken: 'x', user: lea, expiresAt: 'demain' }),
    ],
  ])('efface un stockage corrompu (%s)', (_, raw) => {
    localStorage.setItem(SESSION_KEY, raw);

    expect(restoreSession()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(setAccessToken).not.toHaveBeenCalledWith(expect.any(String));
  });

  it('ne plante pas si le localStorage lève une exception', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(restoreSession()).toBeNull();
    expect(session.user).toBeNull();
  });
});

describe('saveSession sans stockage', () => {
  it('garde la session en mémoire si l’écriture échoue', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => {
      saveSession(auth);
    }).not.toThrow();
    expect(session.user).toEqual(lea);
    expect(setAccessToken).toHaveBeenCalledWith('jeton-1');
  });
});

describe('updateSessionUser', () => {
  it('remplace l’utilisateur sans toucher au jeton ni à l’expiration', () => {
    saveSession(auth);
    const updated: User = { ...lea, firstName: 'Léna' };

    updateSessionUser(updated);

    expect(session.user).toEqual(updated);
    expect(readStored()).toEqual({
      accessToken: 'jeton-1',
      user: updated,
      expiresAt: NOW.getTime() + 3600 * 1000,
    });
  });
});

describe('clearSession', () => {
  it('vide le stockage, le jeton et l’utilisateur', () => {
    saveSession(auth);
    setAccessToken.mockClear();

    clearSession();

    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(setAccessToken).toHaveBeenCalledWith(null);
    expect(session.user).toBeNull();
  });
});

describe('expireSession', () => {
  it('vide la session et renvoie vers la connexion avec la page courante', () => {
    const replace = vi.fn();
    vi.stubGlobal('location', { pathname: '/profil', search: '?onglet=1', replace });
    saveSession(auth);

    expireSession();

    expect(session.user).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(replace).toHaveBeenCalledWith('/connexion?redirect=%2Fprofil%3Fonglet%3D1');
  });
});

describe('hasRole', () => {
  it('compare le rôle de l’utilisateur connecté', () => {
    expect(hasRole('CLIENT')).toBe(false);
    saveSession(auth);
    expect(hasRole('CLIENT')).toBe(true);
    expect(hasRole('GESTIONNAIRE', 'ADMINISTRATEUR')).toBe(false);
  });
});
