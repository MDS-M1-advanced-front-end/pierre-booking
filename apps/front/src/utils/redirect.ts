import type { User, UserRole } from '@room-booking/core';

/** Page de connexion. */
export const LOGIN_PATH = '/connexion';

/** Page affichée quand le rôle de l'utilisateur n'est pas autorisé. */
export const FORBIDDEN_PATH = '/acces-refuse';

/**
 * Construit l'URL de la page de connexion, avec la page à retrouver après connexion.
 * @param path - Chemin courant, recherche comprise (ex. `/reservations?status=PENDING`).
 * @returns `/connexion?redirect=<chemin encodé>`.
 */
export function buildLoginUrl(path: string): string {
  return `${LOGIN_PATH}?redirect=${encodeURIComponent(path)}`;
}

/**
 * Vérifie qu'une cible de redirection est un chemin interne au site.
 * Refuse les URL absolues (`https://…`), relatives au protocole (`//evil.com`, `/\evil.com`)
 * et tout ce qui ne commence pas par une seule barre oblique, pour éviter une redirection ouverte.
 * @param target - Valeur brute du paramètre `redirect`.
 * @returns Le chemin s'il est sûr, sinon `null`.
 */
export function safeRedirectPath(target: string | null | undefined): string | null {
  if (!target || !target.startsWith('/')) return null;
  // `//hôte` et `/\hôte` sont interprétés par les navigateurs comme une autre origine.
  if (target.startsWith('//') || target.startsWith('/\\')) return null;
  // Caractères de contrôle (tabulation, retour à la ligne…) : ignorés par le parseur d'URL.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(target)) return null;
  try {
    const base = 'http://quorum.invalid';
    const url = new URL(target, base);
    if (url.origin !== base) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/**
 * Page d'accueil d'un utilisateur connecté, selon son rôle.
 * @param role - Rôle de l'utilisateur.
 */
export function homePathForRole(role: UserRole): string {
  return role === 'CLIENT' ? '/reservations' : '/gestion/salles';
}

/**
 * Page où envoyer l'utilisateur après connexion : le paramètre `redirect` s'il est sûr,
 * sinon sa page d'accueil.
 * @param target - Valeur brute du paramètre `redirect`.
 * @param role - Rôle de l'utilisateur connecté.
 */
export function resolveRedirect(target: string | null | undefined, role: UserRole): string {
  return safeRedirectPath(target) ?? homePathForRole(role);
}

/** Décision d'une garde d'accès. */
export type GuardDecision =
  | { type: 'allow'; user: User }
  | { type: 'login'; url: string }
  | { type: 'forbidden'; url: string };

/**
 * Décide si une page protégée peut s'afficher.
 * @param user - Utilisateur de la session, ou `null`.
 * @param roles - Rôles autorisés ; absent ou vide : tout utilisateur connecté.
 * @param currentPath - Chemin courant, recherche comprise, pour revenir après connexion.
 */
export function decideAccess(
  user: User | null,
  roles: readonly UserRole[] | undefined,
  currentPath: string,
): GuardDecision {
  if (!user) return { type: 'login', url: buildLoginUrl(currentPath) };
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return { type: 'forbidden', url: FORBIDDEN_PATH };
  }
  return { type: 'allow', user };
}
