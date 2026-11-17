/**
 * Hébergeurs d'images qui redirigent vers un autre domaine : picsum.photos (images du jeu de démo)
 * répond par une redirection vers fastly.picsum.photos, d'où vient vraiment l'image.
 */
const REDIRECTS: Record<string, string> = {
  'https://picsum.photos': 'https://fastly.picsum.photos',
};

/** Au plus quatre préconnexions : au-delà, elles se gênent (recommandation Lighthouse). */
const MAX_ORIGINS = 4;

/**
 * Origines à préconnecter pour afficher des images au plus tôt (`<link rel="preconnect">`).
 * @param urls Adresses des images de la page ; les valeurs vides ou invalides sont ignorées.
 * @returns Origines distinctes, dans l'ordre des images, redirections comprises.
 */
export const imageOrigins = (urls: readonly (string | null | undefined)[]): string[] => {
  const origins = new Set<string>();
  for (const url of urls) {
    if (!url || !URL.canParse(url)) continue;
    const { origin } = new URL(url);
    if (origin === 'null') continue;
    origins.add(origin);
    const target = REDIRECTS[origin];
    if (target) origins.add(target);
  }
  return [...origins].slice(0, MAX_ORIGINS);
};
