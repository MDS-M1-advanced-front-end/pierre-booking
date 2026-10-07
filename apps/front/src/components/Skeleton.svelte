<!--
  Bloc de chargement (maquette : composants.html § RoomCard, état « chargement »).
  Purement décoratif (`aria-hidden`) : le conteneur de la liste porte `aria-busy="true"` et un texte
  « Chargement des salles… » est annoncé à côté (à la charge de l'appelant).
  Variantes : `line` (ligne de texte, largeur via `class`, ex. `w-3/5`), `image` (16/9),
  `room-card` (carte de salle complète).
-->
<script lang="ts">
  interface Props {
    variant?: 'line' | 'image' | 'room-card';
    class?: string;
  }

  let { variant = 'line', class: className }: Props = $props();

  // Dégradé qui glisse (maquette.css, .skeleton) ; l'animation est coupée en mouvement réduit.
  const shimmer = [
    'shimmer bg-size-[200%_100%]',
    'bg-[linear-gradient(90deg,var(--color-surface-muted)_25%,var(--color-border)_50%,var(--color-surface-muted)_75%)]',
  ];
</script>

{#if variant === 'room-card'}
  <div
    class={[
      'flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm',
      className,
    ]}
    aria-hidden="true"
  >
    <div class={[shimmer, 'aspect-video']}></div>
    <div class="flex flex-1 flex-col gap-(--space-2) p-(--space-4)">
      <div class={[shimmer, 'h-[1.125rem] w-3/5 rounded-sm']}></div>
      <div class={[shimmer, 'h-3.5 w-4/5 rounded-sm']}></div>
      <div class={[shimmer, 'h-3.5 w-2/5 rounded-sm']}></div>
    </div>
  </div>
{:else}
  <div
    class={[shimmer, variant === 'image' ? 'aspect-video' : 'h-3.5 rounded-sm', className]}
    aria-hidden="true"
  ></div>
{/if}

<style>
  /* Pas d'équivalent Tailwind sans toucher global.css : animation locale au composant. */
  .shimmer {
    animation: shimmer 1.4s ease-in-out infinite;
  }

  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .shimmer {
      animation: none;
    }
  }
</style>
