// Session de l'utilisateur dans le navigateur (cadrage.md § 2.3).
// Le jeton est gardé dans le localStorage et rendu au client de `core` à chaque page,
// car le client le garde dans une variable de module perdue au rechargement. Il est renouvelé
// par `POST /auth/refresh` avant son expiration (`ensureFreshSession`) ou après un `401`.
import type { AuthResponse, User, UserRole } from '@room-booking/core';
import { buildLoginUrl } from '../../utils/redirect';
import { getAccessToken, refresh, setAccessToken } from '../client';

/** Clé du localStorage. */
export const SESSION_KEY = 'quorum.session';

/** Durée de vie par défaut du jeton si l'API n'envoie pas `expiresIn` (secondes). */
const DEFAULT_EXPIRES_IN = 3600;

/** Marge avant l'expiration du jeton d'accès à partir de laquelle on le renouvelle (ms). */
const REFRESH_MARGIN_MS = 60 * 1000;

/** Contenu enregistré sous `quorum.session`. */
interface StoredSession {
  accessToken: string;
  user: User;
  /** Date d'expiration du jeton d'accès, en millisecondes depuis l'époque Unix. */
  expiresAt: number;
  /** Jeton de rafraîchissement ; `null` pour une session enregistrée avant son ajout. */
  refreshToken: string | null;
}

/** Utilisateur connecté, réactif. À lire seulement : passer par les fonctions de ce module. */
export const session = $state<{ user: User | null }>({ user: null });

const isBrowser = typeof window !== 'undefined';

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    // Stockage indisponible (navigation privée, cookies bloqués…).
    return null;
  }
}

function writeStorage(value: StoredSession): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(value));
  } catch {
    // Stockage plein ou indisponible : la session ne vivra que le temps de la page.
  }
}

function removeStorage(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Rien à faire.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Valide le contenu du stockage : une valeur modifiée à la main ou d'une ancienne version est ignorée. */
function parse(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    const { accessToken, user, expiresAt, refreshToken } = value;
    if (
      typeof accessToken !== 'string' ||
      accessToken === '' ||
      typeof expiresAt !== 'number' ||
      !isRecord(user) ||
      typeof user.id !== 'string' ||
      typeof user.firstName !== 'string' ||
      typeof user.lastName !== 'string' ||
      typeof user.role !== 'string'
    ) {
      return null;
    }
    return {
      accessToken,
      user: user as unknown as User,
      expiresAt,
      refreshToken: typeof refreshToken === 'string' && refreshToken !== '' ? refreshToken : null,
    };
  } catch {
    return null;
  }
}

/**
 * Relit la session du localStorage, rend le jeton au client de `core` et remplit `session.user`.
 * Une session illisible, ou expirée sans jeton de rafraîchissement, est effacée. Une session
 * expirée qui peut être renouvelée est gardée : le premier appel à l'API la renouvelle
 * (`ensureFreshSession`). Sans effet côté serveur.
 * @returns L'utilisateur connecté, ou `null`.
 */
export function restoreSession(): User | null {
  if (!isBrowser) return null;
  const stored = parse(readStorage());
  if (!stored || (stored.expiresAt <= Date.now() && !stored.refreshToken)) {
    clearSession();
    return null;
  }
  setAccessToken(stored.accessToken);
  session.user = stored.user;
  return stored.user;
}

/**
 * Enregistre la session après une connexion ou un renouvellement réussis.
 * @param auth - Réponse de `POST /auth/login` ou de `POST /auth/refresh`. Sans `refreshToken`,
 *   celui de la session enregistrée est gardé.
 */
export function saveSession(auth: AuthResponse): void {
  if (!isBrowser) return;
  const expiresIn = auth.expiresIn ?? DEFAULT_EXPIRES_IN;
  writeStorage({
    accessToken: auth.accessToken,
    user: auth.user,
    expiresAt: Date.now() + expiresIn * 1000,
    refreshToken: auth.refreshToken ?? parse(readStorage())?.refreshToken ?? null,
  });
  setAccessToken(auth.accessToken);
  session.user = auth.user;
}

/**
 * Remplace l'utilisateur de la session (après une modification du profil), sans toucher au jeton.
 * @param user - Utilisateur à jour.
 */
export function updateSessionUser(user: User): void {
  if (!isBrowser) return;
  const stored = parse(readStorage());
  if (stored) writeStorage({ ...stored, user });
  session.user = user;
}

/** Renouvellement en cours, partagé par les appels simultanés : un seul `POST /auth/refresh`. */
let pendingRefresh: Promise<boolean> | null = null;

/**
 * Renouvelle le jeton d'accès avec le jeton de rafraîchissement enregistré. Les appels
 * simultanés partagent la même requête. Le jeton est relu dans le localStorage à chaque fois :
 * un autre onglet a pu le renouveler entre-temps.
 * @returns Vrai si la session est renouvelée ; faux sans jeton de rafraîchissement ou s'il est
 *   refusé (expiré, révoqué par un changement de mot de passe). La session n'est pas effacée :
 *   c'est à l'appelant de décider (voir `withSession`).
 */
export function refreshSession(): Promise<boolean> {
  if (!isBrowser) return Promise.resolve(false);
  pendingRefresh ??= (async () => {
    const refreshToken = parse(readStorage())?.refreshToken;
    if (!refreshToken) return false;
    const result = await refresh({ refreshToken });
    if (result.ok) saveSession(result.data);
    return result.ok;
  })().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

/**
 * À appeler avant chaque requête authentifiée : reprend le jeton si un autre onglet l'a
 * renouvelé, et renouvelle la session si le jeton d'accès expire dans moins d'une minute. Un
 * échec n'est pas traité ici : la requête partira avec l'ancien jeton et le `401` sera géré par
 * `withSession`.
 */
export async function ensureFreshSession(): Promise<void> {
  if (!isBrowser) return;
  const stored = parse(readStorage());
  if (!stored) return;
  if (stored.accessToken !== getAccessToken()) setAccessToken(stored.accessToken);
  if (stored.expiresAt - Date.now() < REFRESH_MARGIN_MS && stored.refreshToken) {
    await refreshSession();
  }
}

/** Efface la session : stockage, jeton du client de `core` et `session.user`. */
export function clearSession(): void {
  if (!isBrowser) return;
  removeStorage();
  setAccessToken(null);
  session.user = null;
}

/**
 * Session refusée par l'API (`401`) : efface la session et renvoie vers la connexion,
 * avec la page courante pour y revenir (cadrage.md § 2.3).
 */
export function expireSession(): void {
  if (!isBrowser) return;
  clearSession();
  location.replace(buildLoginUrl(location.pathname + location.search));
}

/**
 * Indique si l'utilisateur connecté a l'un des rôles donnés.
 * @param roles - Rôles acceptés.
 */
export function hasRole(...roles: UserRole[]): boolean {
  return session.user !== null && roles.includes(session.user.role);
}
