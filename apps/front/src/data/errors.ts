// Normalisation des erreurs renvoyées par les fonctions de `core` (cadrage.md § 2.4 et § 2.6).
import type { ApiError, Result } from '@room-booking/core';
import { expireSession } from './auth/session.svelte';

/** Erreur exploitable par l'interface : `status` HTTP (0 = réseau), `code` et `message` de l'API. */
export type DataError = ApiError;

/** Résultat d'une fonction de `src/data/` : celui de `core`, tel quel. */
export type DataResult<T> = Result<T>;

/** Messages propres au cas, par statut HTTP (ex. `{ 409: 'Ce créneau est déjà réservé.' }`). */
export type ErrorMessages = Partial<Record<number, string>>;

const DEFAULT_MESSAGES: ErrorMessages = {
  0: 'Impossible de joindre le serveur.',
  400: 'Certaines informations sont invalides.',
  401: 'Votre session a expiré, reconnectez-vous.',
  403: "Vous n'avez pas les droits pour cette action.",
  404: "L'élément demandé est introuvable.",
  409: 'Cette action entre en conflit avec une donnée existante.',
  422: 'Certaines informations sont invalides.',
};

const SERVER_ERROR = 'Le serveur a rencontré une erreur, réessayez plus tard.';
const UNKNOWN_ERROR = 'Une erreur inattendue est survenue.';

/**
 * Message français à afficher pour une erreur de l'API.
 * Le message brut de l'API n'est jamais affiché : il peut être technique ou en anglais.
 * @param error - L'erreur du `Result`.
 * @param messages - Messages propres au cas, prioritaires sur les messages génériques.
 */
export function errorMessage(error: DataError, messages: ErrorMessages = {}): string {
  const { status } = error;
  const specific = messages[status];
  if (specific !== undefined) return specific;
  const generic = DEFAULT_MESSAGES[status];
  if (generic !== undefined) return generic;
  return status >= 500 ? SERVER_ERROR : UNKNOWN_ERROR;
}

/**
 * Applique la règle de session aux appels authentifiés : un `401` vide la session et renvoie
 * vers la connexion avec `redirect` (`expireSession`, pas de renouvellement du jeton, cadrage.md § 2.3).
 * @param call - La promesse renvoyée par une fonction de `core`.
 * @returns Le même `Result`.
 */
export async function withSession<T>(call: Promise<Result<T>>): Promise<Result<T>> {
  const result = await call;
  if (!result.ok && result.error.status === 401) expireSession();
  return result;
}
