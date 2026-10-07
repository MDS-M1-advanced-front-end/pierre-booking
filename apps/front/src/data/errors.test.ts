import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorMessage, withSession } from './errors';
import { expireSession } from './auth/session.svelte';

vi.mock('./auth/session.svelte', () => ({ expireSession: vi.fn() }));

const error = (status: number) => ({ status, code: 'X', message: 'raw message' });

describe('errorMessage', () => {
  it.each([
    [400, 'Certaines informations sont invalides.'],
    [401, 'Votre session a expiré, reconnectez-vous.'],
    [403, "Vous n'avez pas les droits pour cette action."],
    [404, "L'élément demandé est introuvable."],
    [409, 'Cette action entre en conflit avec une donnée existante.'],
    [0, 'Impossible de joindre le serveur.'],
    [500, 'Le serveur a rencontré une erreur, réessayez plus tard.'],
    [503, 'Le serveur a rencontré une erreur, réessayez plus tard.'],
    [418, 'Une erreur inattendue est survenue.'],
  ])('statut %i', (status, message) => {
    expect(errorMessage(error(status))).toBe(message);
  });

  it('accepte un message propre au cas', () => {
    const messages = { 409: 'Cette adresse e-mail est déjà utilisée.' };
    expect(errorMessage(error(409), messages)).toBe('Cette adresse e-mail est déjà utilisée.');
    expect(errorMessage(error(400), messages)).toBe('Certaines informations sont invalides.');
  });
});

describe('withSession', () => {
  beforeEach(() => {
    vi.mocked(expireSession).mockClear();
  });

  it('vide la session sur un 401', async () => {
    const result = await withSession(Promise.resolve({ ok: false as const, error: error(401) }));
    expect(result.ok).toBe(false);
    expect(expireSession).toHaveBeenCalledOnce();
  });

  it.each([403, 404, 0])('garde la session sur un %i', async (status) => {
    await withSession(Promise.resolve({ ok: false as const, error: error(status) }));
    expect(expireSession).not.toHaveBeenCalled();
  });

  it('renvoie le succès tel quel', async () => {
    const result = await withSession(Promise.resolve({ ok: true as const, data: 42 }));
    expect(result).toEqual({ ok: true, data: 42 });
    expect(expireSession).not.toHaveBeenCalled();
  });
});
