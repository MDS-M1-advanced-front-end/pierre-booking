// Profils de test du mock Prism, en développement seulement (cadrage.md § 2.5).
//
// Prism renvoie toujours Léa Martin (client-1) sur `POST /auth/login`, quel que soit l'e-mail.
// Pour obtenir un autre profil, il faut l'en-tête `Prefer: example=<clé>`. Ce module enveloppe
// `globalThis.fetch` et ajoute cet en-tête sur `/auth/login` (clé déduite de l'e-mail saisi,
// mémorisée) et sur `/auth/me` (clé mémorisée). Aucune autre route n'est touchée.
//
// Il doit être évalué AVANT `@room-booking/core` : openapi-fetch capture `globalThis.fetch` à la
// création du client. C'est pourquoi `src/data/client.ts` l'importe en première ligne.
// Ne rien importer ici qui charge `core`.

/** Clé du `localStorage` qui mémorise le profil choisi à la connexion. */
export const PERSONA_STORAGE_KEY = 'quorum.mockPersona';

/** E-mails du jeu de données du mock : `client1@salles.example` → `client-1`. */
const PERSONA_EMAIL = /^(client|gestionnaire|admin)([1-9]\d*)@salles\.example$/;

type PersonaStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Déduit la clé d'exemple du mock à partir d'un e-mail du jeu de données.
 * @param email - E-mail saisi (casse et espaces ignorés).
 * @returns La clé (`gestionnaire-1`…), ou `null` si l'e-mail n'appartient pas au jeu de données.
 */
export function personaFromEmail(email: string): string | null {
  const match = PERSONA_EMAIL.exec(email.trim().toLowerCase());
  return match ? `${match[1]}-${match[2]}` : null;
}

function routeOf(request: Request): 'login' | 'me' | null {
  const { pathname } = new URL(request.url);
  if (request.method === 'POST' && pathname.endsWith('/auth/login')) return 'login';
  if (request.method === 'GET' && pathname.endsWith('/auth/me')) return 'me';
  return null;
}

async function emailOf(request: Request): Promise<string | null> {
  try {
    // On lit une copie : le corps de la requête d'origine reste disponible pour l'envoi.
    const body: unknown = await request.clone().json();
    if (body && typeof body === 'object' && 'email' in body && typeof body.email === 'string') {
      return body.email;
    }
  } catch {
    // Corps absent ou illisible : pas de profil.
  }
  return null;
}

function withHeader(request: Request, persona: string): Request {
  const headers = new Headers(request.headers);
  headers.set('Prefer', `example=${persona}`);
  return new Request(request, { headers });
}

/**
 * Ajoute `Prefer: example=<clé>` à une requête `POST /auth/login` ou `GET /auth/me`.
 * À la connexion, la clé est déduite de l'e-mail et mémorisée (ou oubliée si l'e-mail est inconnu).
 * @param request - Requête construite par openapi-fetch.
 * @param storage - Stockage de la clé (le `localStorage` par défaut).
 * @returns La requête, modifiée ou telle quelle.
 */
export async function withPersonaHeader(
  request: Request,
  storage: PersonaStorage = localStorage,
): Promise<Request> {
  const route = routeOf(request);
  if (route === 'login') {
    const email = await emailOf(request);
    const persona = email === null ? null : personaFromEmail(email);
    try {
      if (persona) storage.setItem(PERSONA_STORAGE_KEY, persona);
      else storage.removeItem(PERSONA_STORAGE_KEY);
    } catch {
      // Stockage indisponible (navigation privée…) : l'en-tête est quand même ajouté.
    }
    return persona ? withHeader(request, persona) : request;
  }
  if (route === 'me') {
    let persona: string | null = null;
    try {
      persona = storage.getItem(PERSONA_STORAGE_KEY);
    } catch {
      // Stockage indisponible : profil par défaut du mock.
    }
    return persona ? withHeader(request, persona) : request;
  }
  return request;
}

/**
 * Enveloppe `globalThis.fetch` pour passer chaque `Request` par `withPersonaHeader`.
 * Appelée une seule fois, ci-dessous, en développement et dans le navigateur.
 */
export function installMockPersona(): void {
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) =>
    input instanceof Request
      ? originalFetch(await withPersonaHeader(input), init)
      : originalFetch(input, init);
}

// `import.meta.env.DEV` vaut `false` au build de production : le bloc et le module disparaissent.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  installMockPersona();
}
