<!--
  Histogramme d'une seule série dans le temps (tableau de bord d'administration).
  Colonnes de 24 px au plus, coin arrondi en haut, sur une ligne de base commune ; trois
  graduations discrètes. Pas de légende : le titre, porté par la section qui l'entoure, nomme la
  série. Chaque colonne affiche sa valeur au survol ; un lecteur d'écran la lit dans la liste des
  colonnes, et toutes les valeurs restent lisibles au clavier dans le tableau « Voir les données »
  (une colonne n'a pas d'action : elle ne prend pas le focus).

  Props :
    points        colonnes, dans l'ordre : `label` (axe), `detail` (info-bulle et tableau), `value`
    formatValue   format des valeurs (axe, info-bulle, tableau)
    label         nom accessible du graphique, ex. « Chiffre d'affaires par semaine »
    columnLabel   en-tête de la première colonne du tableau, ex. « Semaine »
    valueLabel    en-tête de la colonne des valeurs, ex. « Chiffre d'affaires »
-->
<script lang="ts">
  import { labelIndices, niceCeil } from '../utils/chartScale';

  interface Point {
    label: string;
    detail: string;
    value: number;
  }

  interface Props {
    points: Point[];
    formatValue: (value: number) => string;
    label: string;
    columnLabel: string;
    valueLabel: string;
  }

  let { points, formatValue, label, columnLabel, valueLabel }: Props = $props();

  /** Étiquettes d'axe affichées au plus, pour qu'elles ne se chevauchent pas (desktop, mobile). */
  const MAX_AXIS_LABELS = 6;
  const MAX_AXIS_LABELS_MOBILE = 3;

  const top = $derived(niceCeil(Math.max(0, ...points.map((p) => p.value))));
  const ticks = $derived(top === 0 ? [0] : [top, top / 2, 0]);
  const shown = $derived(labelIndices(points.length, MAX_AXIS_LABELS));
  const shownMobile = $derived(labelIndices(points.length, MAX_AXIS_LABELS_MOBILE));
  const height = (value: number) => (top === 0 ? 0 : (value / top) * 100);
</script>

<figure class="m-0 flex flex-col gap-(--space-3)">
  <div class="flex gap-(--space-2)">
    <!-- Graduations : texte en couleur de texte discrète, jamais celle de la série -->
    <div
      class="flex h-48 flex-col justify-between text-right text-xs text-text-muted tabular-nums"
      aria-hidden="true"
    >
      {#each ticks as tick (tick)}
        <span class="-my-[0.5lh]">{formatValue(tick)}</span>
      {/each}
    </div>
    <div class="flex min-w-0 flex-1 flex-col">
      <div
        class="relative flex h-48 items-end justify-around border-b border-border"
        role="list"
        aria-label={label}
      >
        <!-- Lignes de graduation, fines et discrètes -->
        {#each ticks.slice(0, -1) as tick (tick)}
          <span
            class="pointer-events-none absolute inset-x-0 border-t border-border"
            style:bottom={`${height(tick)}%`}
            aria-hidden="true"
          ></span>
        {/each}
        {#each points as point (point.detail)}
          <!-- Zone de survol plus large que la colonne : toute la hauteur et toute la tranche -->
          <div class="group relative flex h-full flex-1 items-end justify-center" role="listitem">
            <span class="visually-hidden">{point.detail} : {formatValue(point.value)}</span>
            <span
              class="block w-full max-w-6 rounded-t-sm bg-action transition-opacity group-hover:opacity-80"
              style:height={`${height(point.value)}%`}
              aria-hidden="true"
            ></span>
            <span
              class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-(--space-1) hidden -translate-x-1/2 rounded-md border border-border bg-surface px-(--space-3) py-(--space-2) text-xs whitespace-nowrap shadow-md group-hover:block"
              aria-hidden="true"
            >
              <strong class="block text-sm text-text">{formatValue(point.value)}</strong>
              <span class="text-text-muted">{point.detail}</span>
            </span>
          </div>
        {/each}
      </div>
      <div class="flex justify-around pt-(--space-1) text-xs text-text-muted" aria-hidden="true">
        {#each points as point, index (point.detail)}
          <span
            class={[
              // Étiquette centrée sous sa colonne ; la dernière, calée à droite, déborde vers
              // l'intérieur plutôt qu'au-delà du graphique
              'flex min-w-0 flex-1 whitespace-nowrap',
              index === points.length - 1 ? 'justify-end' : 'justify-center',
              !shownMobile.has(index) && 'max-md:invisible',
              !shown.has(index) && 'md:invisible',
            ]}
          >
            {shown.has(index) || shownMobile.has(index) ? point.label : ''}
          </span>
        {/each}
      </div>
    </div>
  </div>
  <details class="text-sm">
    <summary class="cursor-pointer text-action">Voir les données</summary>
    <table class="mt-(--space-2) w-full border-collapse">
      <caption class="visually-hidden">{label}</caption>
      <thead>
        <tr>
          <th scope="col" class="py-(--space-1) text-left text-text-muted">{columnLabel}</th>
          <th scope="col" class="py-(--space-1) text-right text-text-muted">{valueLabel}</th>
        </tr>
      </thead>
      <tbody>
        {#each points as point (point.detail)}
          <tr class="border-t border-border">
            <th scope="row" class="py-(--space-1) text-left font-regular">{point.detail}</th>
            <td class="py-(--space-1) text-right tabular-nums">{formatValue(point.value)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </details>
</figure>
