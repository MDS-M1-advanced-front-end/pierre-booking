// Session de l'utilisateur dans le navigateur (cadrage.md § 2.3).
// Le jeton est gardé dans le localStorage et rendu au client de `core` à chaque page,
// car le client le garde dans une variable de module perdue au rechargement.
import type { AuthResponse, User, UserRole } from '@room-booking/core';
import { buildLoginUrl } from '../../utils/redirect';
import { setAccessToken } from '../client';

/** Clé du localStorage. */
export const SESSION_KEY = 'quorum.session';

/** Durée de vie par défaut du jeton si l'API n'envoie pas `expiresIn` (secondes). */
const DEFAULT_EXPIRES_IN = 3600;

/** Contenu enregistré sous `quorum.session`. */
interface StoredSession {
  accessToken: string;
  user: User;
  /** Date d'expiration en millisecondes depuis l'époque Unix. */
  expiresAt: number;
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
    const { accessToken, user, expiresAt } = value;
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
    return { accessToken, user: user as unknown as User, expiresAt };
  } catch {
    return null;
  }
}

/**
 * Relit la session du localStorage, rend le jeton au client de `core` et remplit `session.user`.
 * Une session expirée ou illisible est effacée. Sans effet côté serveur.
 * @returns L'utilisateur connecté, ou `null`.
 */
export function restoreSession(): User | null {
  if (!isBrowser) return null;
  const stored = parse(readStorage());
  if (!stored || stored.expiresAt <= Date.now()) {
    clearSession();
    return null;
  }
  setAccessToken(stored.accessToken);
  session.user = stored.user;
  return stored.user;
}

/**
 * Enregistre la session après une connexion réussie.
 * @param auth - Réponse de `POST /auth/login`.
 */
export function saveSession(auth: AuthResponse): void {
  if (!isBrowser) return;
  const expiresIn = auth.expiresIn ?? DEFAULT_EXPIRES_IN;
  writeStorage({
    accessToken: auth.accessToken,
    user: auth.user,
    expiresAt: Date.now() + expiresIn * 1000,
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
