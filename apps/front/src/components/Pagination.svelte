<!--
  Pagination par liens (maquette : écran 01, composants.html § États) : fonctionne sans JavaScript,
  donc en rendu serveur. Résumé « Salles 1 à 6 sur 11 », puis Précédente, numéros de page et
  Suivante. Sur une seule page, seul le résumé est affiché ; rien s'il n'y a aucun élément.
-->
<script lang="ts">
  import { paginate } from '../utils/pagination';

  interface Props {
    /** Page courante, à partir de 1. */
    page: number;
    pageSize: number;
    /** Nombre total d'éléments. */
    total: number;
    /** URL d'une page, ex. `(p) => '/?' + new URLSearchParams({ ...filtres, page: String(p) })`. */
    hrefFor: (page: number) => string;
    /** Nom des éléments dans le résumé (défaut : « Salles »). */
    itemLabel?: string;
    /** Nom accessible de la navigation (défaut : « Pagination »). */
    label?: string;
  }

  let {
    page,
    pageSize,
    total,
    hrefFor,
    itemLabel = 'Salles',
    label = 'Pagination',
  }: Props = $props();

  const model = $derived(paginate({ page, pageSize, total }));

  const itemClass =
    'inline-grid h-(--size-control) min-w-(--size-control) place-items-center rounded-md px-(--space-2) font-semibold no-underline';
  const linkClass = `${itemClass} hover:bg-action-subtle`;
</script>

{#snippet summary()}
  <p class="text-sm text-text-muted">
    {itemLabel}
    {model.firstItem} à {model.lastItem} sur {total}
  </p>
{/snippet}

{#if total > 0}
  {#if model.pageCount > 1}
    <nav
      class="mt-(--space-5) flex flex-wrap items-center justify-between gap-(--space-3)"
      aria-label={label}
    >
      {@render summary()}
      <ul class="flex flex-wrap gap-(--space-1)">
        {#if model.previous !== null}
          <li>
            <a class={linkClass} href={hrefFor(model.previous)}>
              Précédente<span class="sr-only"> page</span>
            </a>
          </li>
        {/if}
        {#each model.items as item, index (index)}
          <li>
            {#if item === 'gap'}
              <span class={[itemClass, 'text-text-muted']} aria-hidden="true">…</span>
            {:else if item === model.page}
              <span class={[itemClass, 'bg-action text-on-action']} aria-current="page">
                <span class="sr-only">Page </span>{item}
              </span>
            {:else}
              <a class={linkClass} href={hrefFor(item)}>
                <span class="sr-only">Page </span>{item}
              </a>
            {/if}
          </li>
        {/each}
        {#if model.next !== null}
          <li>
            <a class={linkClass} href={hrefFor(model.next)}>
              Suivante<span class="sr-only"> page</span>
            </a>
          </li>
        {/if}
      </ul>
    </nav>
  {:else}
    <div class="mt-(--space-5)">{@render summary()}</div>
  {/if}
{/if}
