import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorMessage, withSession } from './errors';
import { ensureFreshSession, expireSession, refreshSession } from './auth/session.svelte';
import { isOffline } from './offline/network.svelte';

vi.mock('./offline/network.svelte', () => ({ isOffline: vi.fn(() => false) }));
vi.mock('./auth/session.svelte', () => ({
  ensureFreshSession: vi.fn(),
  refreshSession: vi.fn(),
  expireSession: vi.fn(),
}));

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

  it('dit « hors ligne » sur une erreur réseau quand le navigateur est hors ligne', () => {
    vi.mocked(isOffline).mockReturnValueOnce(true);
    expect(errorMessage(error(0))).toBe(
      'Vous êtes hors ligne : cette action sera possible au retour de la connexion.',
    );
  });

  it('accepte un message propre au cas', () => {
    const messages = { 409: 'Cette adresse e-mail est déjà utilisée.' };
    expect(errorMessage(error(409), messages)).toBe('Cette adresse e-mail est déjà utilisée.');
    expect(errorMessage(error(400), messages)).toBe('Certaines informations sont invalides.');
  });
});

describe('withSession', () => {
  const fail = (status: number) => ({ ok: false as const, error: error(status) });

  beforeEach(() => {
    vi.mocked(expireSession).mockClear();
    vi.mocked(ensureFreshSession).mockClear();
    vi.mocked(refreshSession).mockReset().mockResolvedValue('rejected');
  });

  it('renouvelle le jeton si besoin avant l’appel', async () => {
    const call = vi.fn().mockResolvedValue({ ok: true, data: 42 });
    await withSession(call);
    expect(ensureFreshSession).toHaveBeenCalledOnce();
    expect(vi.mocked(ensureFreshSession).mock.invocationCallOrder[0]).toBeLessThan(
      call.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('sur un 401, renouvelle la session et rejoue l’appel une fois', async () => {
    vi.mocked(refreshSession).mockResolvedValue('renewed');
    const call = vi
      .fn()
      .mockResolvedValueOnce(fail(401))
      .mockResolvedValueOnce({ ok: true, data: 42 });
    const result = await withSession(call);
    expect(result).toEqual({ ok: true, data: 42 });
    expect(call).toHaveBeenCalledTimes(2);
    expect(expireSession).not.toHaveBeenCalled();
  });

  it('garde la session si le renouvellement est impossible pour l’instant (réseau, panne)', async () => {
    vi.mocked(refreshSession).mockResolvedValue('unavailable');
    const call = vi.fn().mockResolvedValue(fail(401));
    const result = await withSession(call);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.status).toBe(0);
    expect(call).toHaveBeenCalledOnce();
    expect(expireSession).not.toHaveBeenCalled();
  });

  it('vide la session si le renouvellement est refusé', async () => {
    const call = vi.fn().mockResolvedValue(fail(401));
    const result = await withSession(call);
    expect(result.ok).toBe(false);
    expect(call).toHaveBeenCalledOnce();
    expect(expireSession).toHaveBeenCalledOnce();
  });

  it('vide la session si le 401 persiste après le renouvellement', async () => {
    vi.mocked(refreshSession).mockResolvedValue('renewed');
    const call = vi.fn().mockResolvedValue(fail(401));
    await withSession(call);
    expect(call).toHaveBeenCalledTimes(2);
    expect(expireSession).toHaveBeenCalledOnce();
  });

  it.each([403, 404, 0])('garde la session sur un %i, sans renouveler', async (status) => {
    await withSession(() => Promise.resolve(fail(status)));
    expect(refreshSession).not.toHaveBeenCalled();
    expect(expireSession).not.toHaveBeenCalled();
  });

  it('renvoie le succès tel quel', async () => {
    const result = await withSession(() => Promise.resolve({ ok: true as const, data: 42 }));
    expect(result).toEqual({ ok: true, data: 42 });
    expect(expireSession).not.toHaveBeenCalled();
  });
});
