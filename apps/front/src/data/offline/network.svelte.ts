// État du réseau, réactif, partagé par toute la page : bandeau « hors ligne » (AppStatus) et
// boutons d'action désactivés hors ligne (Button, `needsNetwork`).
// Règle de la PWA : consultation hors ligne, actions en ligne.

/** `online` : faux quand le navigateur se sait hors ligne. À lire seulement. */
export const network = $state({ online: true });

let watching = false;

/**
 * Lit l'état du réseau et le suit (événements `online` / `offline`). Sans effet côté serveur ou si
 * c'est déjà fait.
 */
export function watchNetwork(): void {
  if (typeof window === 'undefined' || watching) return;
  watching = true;
  network.online = navigator.onLine;
  window.addEventListener('online', () => {
    network.online = true;
  });
  window.addEventListener('offline', () => {
    network.online = false;
  });
}

/** Vrai si le navigateur se sait hors ligne (lecture directe, hors composant). */
export const isOffline = (): boolean => typeof navigator !== 'undefined' && !navigator.onLine;
