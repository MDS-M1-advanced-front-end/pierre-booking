<!--
  Onglets de filtre par liens (maquette : écran 06, « Filtrer par statut »). Chaque onglet est un
  lien (filtre dans l'URL) ; l'onglet courant porte `aria-current="page"`.
-->
<script lang="ts">
  interface Item {
    label: string;
    href: string;
    current: boolean;
  }

  interface Props {
    /** Nom accessible de la navigation, ex. « Filtrer par statut ». */
    label: string;
    items: Item[];
    class?: string;
  }

  let { label, items, class: className }: Props = $props();
</script>

<nav aria-label={label} class={className}>
  <ul
    class="mb-(--space-4) flex gap-(--space-1) overflow-x-auto rounded-md bg-surface-muted p-(--space-1)"
  >
    {#each items as item (item.href)}
      <li>
        <a
          href={item.href}
          aria-current={item.current ? 'page' : undefined}
          class={[
            'inline-flex min-h-(--size-control-sm) items-center gap-(--space-2) rounded-sm px-(--space-3)',
            'text-sm font-semibold whitespace-nowrap no-underline',
            item.current ? 'bg-surface text-action shadow-sm' : 'text-text hover:text-action',
          ]}
        >
          {item.label}
        </a>
      </li>
    {/each}
  </ul>
</nav>
