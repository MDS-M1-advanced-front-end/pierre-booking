/**
 * Calcul d'une pagination à partir de la page courante, de la taille de page et du nombre total
 * d'éléments (réponse paginée de `GET /rooms`). Fonction pure, utilisée par `Pagination.svelte`.
 */

export interface PaginationInput {
  /** Page demandée, à partir de 1 (ramenée entre 1 et la dernière page). */
  page: number;
  /** Nombre d'éléments par page (au moins 1). */
  pageSize: number;
  /** Nombre total d'éléments. */
  total: number;
  /** Nombre de pages affichées de chaque côté de la page courante (1 par défaut). */
  siblings?: number;
}

/** Un numéro de page, ou `'gap'` pour des pages masquées (affiché « … »). */
export type PaginationItem = number | 'gap';

export interface Pagination {
  /** Page courante, ramenée entre 1 et `pageCount`. */
  page: number;
  /** Nombre de pages (au moins 1, même sans élément). */
  pageCount: number;
  /** Page précédente, ou `null` sur la première. */
  previous: number | null;
  /** Page suivante, ou `null` sur la dernière. */
  next: number | null;
  /** Rang du premier élément de la page (à partir de 1), 0 s'il n'y a aucun élément. */
  firstItem: number;
  /** Rang du dernier élément de la page, 0 s'il n'y a aucun élément. */
  lastItem: number;
  /** Pages à afficher : toujours la première, la dernière et les voisines de la page courante. */
  items: PaginationItem[];
}

const toInteger = (value: number, fallback: number) =>
  Number.isFinite(value) ? Math.trunc(value) : fallback;

export function paginate({ page, pageSize, total, siblings = 1 }: PaginationInput): Pagination {
  const size = Math.max(1, toInteger(pageSize, 1));
  const count = Math.max(0, toInteger(total, 0));
  const pageCount = Math.max(1, Math.ceil(count / size));
  const current = Math.min(pageCount, Math.max(1, toInteger(page, 1)));
  const around = Math.max(0, toInteger(siblings, 1));

  const firstItem = count === 0 ? 0 : (current - 1) * size + 1;
  const lastItem = Math.min(current * size, count);

  // Pages visibles : 1, dernière, et la fenêtre autour de la page courante.
  const visible = new Set<number>([1, pageCount]);
  for (let p = current - around; p <= current + around; p++) {
    if (p >= 1 && p <= pageCount) visible.add(p);
  }
  const sorted = [...visible].sort((a, b) => a - b);

  // Un trou d'une seule page est remplacé par cette page (« 1 2 3 » plutôt que « 1 … 3 »).
  const items: PaginationItem[] = [];
  let before = 0;
  for (const p of sorted) {
    if (before > 0 && p - before === 2) items.push(before + 1);
    else if (before > 0 && p - before > 2) items.push('gap');
    items.push(p);
    before = p;
  }

  return {
    page: current,
    pageCount,
    previous: current > 1 ? current - 1 : null,
    next: current < pageCount ? current + 1 : null,
    firstItem,
    lastItem,
    items,
  };
}
