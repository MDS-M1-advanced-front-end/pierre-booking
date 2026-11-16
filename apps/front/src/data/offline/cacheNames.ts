// Noms des caches du service worker (src/sw.ts), partagés avec la page : la déconnexion vide le
// cache des réponses de l'API, qui contient des données personnelles (voir `clearPrivateCaches`).

/** Pages rendues par le serveur, dernière version vue. */
export const PAGES_CACHE = 'quorum-pages';

/** Lectures de l'API (salles, réservations), dernière version vue. Vidé à la déconnexion. */
export const API_CACHE = 'quorum-api';

/** Adresse de la page « hors ligne », précachée. */
export const OFFLINE_PAGE = '/hors-ligne/';
