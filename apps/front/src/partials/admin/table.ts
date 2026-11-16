// Classes du tableau qui s'empile en mobile (maquette.css, .table et .table--stack), partagées par
// les listes de l'administration ; même rendu que « Mes salles » (écran 08).

export const tableFrame = 'overflow-hidden rounded-lg border border-border bg-surface';
export const tableClass = 'w-full border-collapse text-sm';
export const headClass = 'max-md:visually-hidden';
export const headCell =
  'border-t border-border bg-bg px-(--space-4) py-(--space-3) text-left font-semibold whitespace-nowrap text-text-muted';
export const row =
  'max-md:block max-md:border-t max-md:border-border max-md:px-(--space-4) max-md:py-(--space-3) max-md:first:border-t-0';
export const cell = [
  'border-t border-border px-(--space-4) py-(--space-3) text-left align-middle',
  'max-md:flex max-md:justify-between max-md:gap-(--space-4) max-md:border-0 max-md:px-0 max-md:py-(--space-1)',
];
/** Cellule précédée de son intitulé (`data-label`) en mobile. */
export const labelled =
  'max-md:text-right max-md:before:text-left max-md:before:font-regular max-md:before:text-text-muted max-md:before:content-[attr(data-label)]';
export const numeric = 'md:text-right tabular-nums';
export const actionsCell =
  'whitespace-nowrap md:text-right max-md:justify-end max-md:pt-(--space-2)';
