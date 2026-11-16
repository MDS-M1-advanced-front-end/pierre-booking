import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('watchNetwork', () => {
  it('lit l’état initial puis suit les événements online / offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { network, watchNetwork } = await import('./network.svelte');

    watchNetwork();
    expect(network.online).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect(network.online).toBe(true);
    window.dispatchEvent(new Event('offline'));
    expect(network.online).toBe(false);
  });

  it('isOffline lit le navigateur directement', async () => {
    const { isOffline } = await import('./network.svelte');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect(isOffline()).toBe(true);
  });
});
