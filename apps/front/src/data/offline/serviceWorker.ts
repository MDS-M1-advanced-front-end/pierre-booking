// Enregistrement du service worker (src/sw.ts, compilé en /sw.js au build) et mises à jour.
import { Workbox } from 'workbox-window';
import { API_CACHE } from './cacheNames';

/**
 * Enregistre le service worker. Rien en développement (il n'existe qu'au build) ni sans support.
 * @param onUpdate - Appelé quand une nouvelle version attend : `apply()` l'active puis recharge la
 *   page (bandeau « Nouvelle version disponible »).
 */
export function registerServiceWorker(onUpdate: (apply: () => void) => void): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  const wb = new Workbox('/sw.js');
  wb.addEventListener('waiting', () => {
    onUpdate(() => {
      wb.addEventListener('controlling', () => {
        location.reload();
      });
      wb.messageSkipWaiting();
    });
  });
  void wb.register();
}

/**
 * Vide le cache des réponses de l'API : il contient des données personnelles (réservations), qu'un
 * autre compte ne doit pas voir sur le même appareil. Appelé quand la session est effacée.
 */
export async function clearPrivateCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    await caches.delete(API_CACHE);
  } catch {
    // Stockage indisponible : rien à effacer.
  }
}
