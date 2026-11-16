/**
 * Haut de l'axe d'un graphique : le plus petit nombre « rond » (1, 2 ou 5 × 10^n) au moins égal
 * au maximum, pour des graduations lisibles. 0 si toutes les valeurs sont nulles ou négatives.
 * @param max - Plus grande valeur affichée.
 */
export const niceCeil = (max: number): number => {
  if (!(max > 0)) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 5, 10].find((factor) => factor * magnitude >= max) ?? 10;
  return step * magnitude;
};

/**
 * Indices des étiquettes d'axe à afficher : au plus `max`, régulièrement espacées, la dernière
 * toujours comprise (la plus récente, celle qu'on cherche).
 * @param count - Nombre de points.
 * @param max - Nombre d'étiquettes au plus.
 */
export const labelIndices = (count: number, max: number): Set<number> => {
  const indices = new Set<number>();
  if (count === 0) return indices;
  const step = Math.max(1, Math.ceil(count / max));
  for (let i = count - 1; i >= 0; i -= step) indices.add(i);
  return indices;
};
