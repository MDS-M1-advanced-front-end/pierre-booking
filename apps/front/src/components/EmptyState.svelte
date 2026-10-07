<!--
  État vide d'une liste (maquette : composants.html § États, « Aucune salle ne correspond »).
  Sert aussi de base à `ErrorState`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Icon, { type IconName } from './Icon.svelte';

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'class' | 'children'> {
    title: string;
    /** Phrase d'explication, en gris sous le titre. */
    text?: string;
    /** Icône décorative au-dessus du titre (défaut : `search`). */
    icon?: IconName;
    /** Niveau du titre selon la page (défaut : `h3`, comme la maquette). */
    headingLevel?: 2 | 3 | 4;
    /** Action proposée, ex. `<Button variant="secondary" href="/">Réinitialiser les filtres</Button>`. */
    action?: Snippet;
    class?: string;
  }

  let {
    title,
    text,
    icon = 'search',
    headingLevel = 3,
    action,
    class: className,
    ...rest
  }: Props = $props();
</script>

<div
  {...rest}
  class={[
    'flex flex-col items-center gap-(--space-3) px-(--space-4) py-(--space-8) text-center',
    'rounded-lg border border-dashed border-border-strong bg-surface',
    className,
  ]}
>
  <Icon name={icon} class="size-12 stroke-[1.5] text-text-muted" />
  <svelte:element this={`h${headingLevel}`}>{title}</svelte:element>
  {#if text}
    <p class="max-w-md text-text-muted">{text}</p>
  {/if}
  {@render action?.()}
</div>
