import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_CACHE } from './cacheNames';
import { clearPrivateCaches } from './serviceWorker';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('clearPrivateCaches', () => {
  it('supprime seulement le cache des réponses de l’API', async () => {
    const remove = vi.fn(() => Promise.resolve(true));
    vi.stubGlobal('caches', { delete: remove });
    await clearPrivateCaches();
    expect(remove).toHaveBeenCalledExactlyOnceWith(API_CACHE);
  });

  it('ne plante pas sans Cache Storage, ni s’il est refusé', async () => {
    await expect(clearPrivateCaches()).resolves.toBeUndefined();
    vi.stubGlobal('caches', { delete: () => Promise.reject(new Error('SecurityError')) });
    await expect(clearPrivateCaches()).resolves.toBeUndefined();
  });
});
