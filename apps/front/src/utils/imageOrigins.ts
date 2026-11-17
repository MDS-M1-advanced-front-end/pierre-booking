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
 * Origines à préconnecter pour afficher des images au plus tôt (`<link rel="preconnect">`). Seules
 * comptent les cibles de redirection : l'origine d'une image écrite dans le HTML est découverte
 * aussitôt par le navigateur, une préconnexion n'y gagne rien (Lighthouse la signale inutilisée).
 * @param urls Adresses des images de la page ; les valeurs vides ou invalides sont ignorées.
 * @returns Origines distinctes vers lesquelles ces images redirigent, dans l'ordre des images.
 */
export const imageOrigins = (urls: readonly (string | null | undefined)[]): string[] => {
  const origins = new Set<string>();
  for (const url of urls) {
    if (!url || !URL.canParse(url)) continue;
    const target = REDIRECTS[new URL(url).origin];
    if (target) origins.add(target);
  }
  return [...origins].slice(0, MAX_ORIGINS);
};
