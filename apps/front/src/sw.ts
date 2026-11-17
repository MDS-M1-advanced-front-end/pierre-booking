/// <reference lib="webworker" />
// Service worker de Quorum (PWA) : il se place entre les pages et le réseau.
// Construit par @vite-pwa/astro (stratégie buildSW) : `self.__WB_MANIFEST` est remplacé au
// build par la liste des fichiers du site (JS, CSS, pages statiques, icônes) à précacher.
//
// Règle retenue : consultation hors ligne, actions en ligne.
// - Fichiers du site et pages statiques : précachés, servis depuis le cache (mis à jour à chaque
//   nouvelle version du service worker).
// - Pages rendues par le serveur (catalogue, fiche salle…) : réseau d'abord, dernière version vue
//   hors ligne, sinon la page « hors ligne ».
// - Lectures de l'API (salles, réservations) : réseau d'abord, dernière réponse hors ligne. Les
//   écritures (POST, PATCH, DELETE) et GraphQL (toujours en POST) ne sont jamais mises en cache.
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { API_CACHE, OFFLINE_PAGE, PAGES_CACHE } from './data/offline/cacheNames';

declare const self: ServiceWorkerGlobalScope;

/** Au-delà, on sert la dernière version en cache plutôt que d'attendre un réseau très lent. */
const NETWORK_TIMEOUT_SECONDS = 4;
const DAY_SECONDS = 24 * 60 * 60;

// Pages statiques : Astro les écrit en `/connexion/index.html`, servies à l'adresse `/connexion`.
// Leurs paramètres d'URL (`/reservations?status=…`, `?queued=1`) sont lus dans le navigateur : la
// page précachée sert pour toutes les variantes, y compris hors ligne.
precacheAndRoute(self.__WB_MANIFEST, {
  ignoreURLParametersMatching: [/.*/],
  urlManipulation: ({ url }) => {
    if (url.pathname.endsWith('/') || url.pathname.includes('.')) return [];
    return [new URL(`${url.pathname}/index.html`, url)];
  },
});
cleanupOutdatedCaches();

// Pages rendues par le serveur
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: PAGES_CACHE,
      networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
        new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * DAY_SECONDS }),
      ],
    }),
  ),
);

// Lectures de l'API : salles (catalogue, fiche, disponibilités) et réservations. L'API est sur une
// autre origine (PUBLIC_API_BASE_URL) : on reconnaît ses routes au chemin.
const API_READ = /\/api\/(rooms|reservations)(\/|$)/;
registerRoute(
  ({ url, request }) => request.method === 'GET' && API_READ.test(url.pathname),
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * DAY_SECONDS }),
    ],
  }),
);

// Page jamais visitée et réseau absent : la page « hors ligne » (précachée)
setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    return (await matchPrecache(`${OFFLINE_PAGE}index.html`)) ?? Response.error();
  }
  return Response.error();
});

// Nouvelle version : elle attend que la page la demande (bandeau « Nouvelle version disponible »)
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting();
});
