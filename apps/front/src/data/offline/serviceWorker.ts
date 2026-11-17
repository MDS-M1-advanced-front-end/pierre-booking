// Enregistrement du service worker (src/sw.ts, compilé en /sw.js au build), mise à jour automatique.
import { API_CACHE } from './cacheNames';

/**
 * Enregistre le service worker. Rien en développement (il n'existe qu'au build) ni sans support.
 * Mise à jour automatique : quand une nouvelle version prend la main (après un déploiement), la
 * page se recharge pour charger le nouveau code. Pas de rechargement à la première installation.
 */
export function registerServiceWorker(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  // Première prise en main (première visite) : simple installation. Les suivantes : mise à jour.
  let controlled = navigator.serviceWorker.controller !== null;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!controlled) {
      controlled = true;
      return;
    }
    if (reloading) return;
    reloading = true;
    location.reload();
  });
  void navigator.serviceWorker.register('/sw.js');
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
