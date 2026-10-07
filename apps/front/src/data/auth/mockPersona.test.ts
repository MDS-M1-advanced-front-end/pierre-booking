import { describe, expect, it } from 'vitest';
import { PERSONA_STORAGE_KEY, personaFromEmail, withPersonaHeader } from './mockPersona';

const API = 'http://localhost:4010';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

function loginRequest(email: string): Request {
  return new Request(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  });
}

describe('personaFromEmail', () => {
  it.each([
    ['client1@salles.example', 'client-1'],
    ['gestionnaire1@salles.example', 'gestionnaire-1'],
    ['gestionnaire3@salles.example', 'gestionnaire-3'],
    ['admin2@salles.example', 'admin-2'],
    ['  Gestionnaire2@Salles.Example ', 'gestionnaire-2'],
  ])('%s → %s', (email, key) => {
    expect(personaFromEmail(email)).toBe(key);
  });

  it.each(['lea@exemple.fr', 'client@salles.example', 'client0@salles.example', 'x'])(
    '%s → null',
    (email) => {
      expect(personaFromEmail(email)).toBeNull();
    },
  );
});

describe('withPersonaHeader', () => {
  it('ajoute Prefer à la connexion et mémorise le profil', async () => {
    const storage = memoryStorage();
    const request = await withPersonaHeader(loginRequest('gestionnaire1@salles.example'), storage);
    expect(request.headers.get('Prefer')).toBe('example=gestionnaire-1');
    expect(storage.values.get(PERSONA_STORAGE_KEY)).toBe('gestionnaire-1');
    // Le corps reste lisible pour l'envoi.
    expect(await request.json()).toEqual({
      email: 'gestionnaire1@salles.example',
      password: 'password123',
    });
    expect(request.headers.get('Content-Type')).toBe('application/json');
  });

  it("oublie le profil mémorisé si l'e-mail est inconnu", async () => {
    const storage = memoryStorage({ [PERSONA_STORAGE_KEY]: 'admin-1' });
    const request = await withPersonaHeader(loginRequest('lea@exemple.fr'), storage);
    expect(request.headers.has('Prefer')).toBe(false);
    expect(storage.values.has(PERSONA_STORAGE_KEY)).toBe(false);
  });

  it('ajoute le profil mémorisé sur /auth/me', async () => {
    const storage = memoryStorage({ [PERSONA_STORAGE_KEY]: 'admin-1' });
    const request = await withPersonaHeader(
      new Request(`${API}/auth/me`, { headers: { Authorization: 'Bearer t' } }),
      storage,
    );
    expect(request.headers.get('Prefer')).toBe('example=admin-1');
    expect(request.headers.get('Authorization')).toBe('Bearer t');
  });

  it('ne touche pas /auth/me sans profil mémorisé', async () => {
    const request = await withPersonaHeader(new Request(`${API}/auth/me`), memoryStorage());
    expect(request.headers.has('Prefer')).toBe(false);
  });

  it('ne touche pas les autres routes, même avec un profil mémorisé', async () => {
    const storage = memoryStorage({ [PERSONA_STORAGE_KEY]: 'gestionnaire-1' });
    const original = new Request(`${API}/rooms/3f2b8c1e-7a4d-4e9b-9c1a-2d5e6f7a8b9c`);
    const request = await withPersonaHeader(original, storage);
    expect(request).toBe(original);
    expect(request.headers.has('Prefer')).toBe(false);
  });

  it('fonctionne avec un préfixe de base (/api/auth/login)', async () => {
    const request = await withPersonaHeader(
      new Request('http://localhost:8080/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'client2@salles.example', password: 'x' }),
      }),
      memoryStorage(),
    );
    expect(request.headers.get('Prefer')).toBe('example=client-2');
  });
});
