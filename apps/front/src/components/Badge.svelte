<script lang="ts">
  import type { Snippet } from 'svelte';

  type Variant = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'neutral';

  interface Props {
    variant: Variant;
    children: Snippet;
  }

  let { variant, children }: Props = $props();

  // Couleurs et forme de la pastille par variante (maquette.css, .badge--*).
  // La forme change selon le statut : l'information ne repose pas que sur la couleur (WCAG 1.4.1).
  const variantClasses: Record<Variant, string> = {
    pending:
      'bg-status-pending-bg text-status-pending-text before:border-2 before:border-current before:bg-transparent',
    confirmed: 'bg-status-confirmed-bg text-status-confirmed-text',
    rejected:
      'bg-status-rejected-bg text-status-rejected-text before:rotate-45 before:rounded-[1px]',
    cancelled:
      'bg-status-cancelled-bg text-status-cancelled-text before:rotate-45 before:rounded-[1px]',
    completed: 'bg-status-completed-bg text-status-completed-text',
    neutral: 'bg-surface-muted text-status-cancelled-text',
  };
</script>

<span
  class={[
    'inline-flex items-center gap-(--space-1) rounded-full px-(--space-2) py-[0.125rem]',
    'text-xs leading-base font-bold whitespace-nowrap',
    "before:size-2 before:rounded-full before:bg-current before:content-['']",
    variantClasses[variant],
  ]}
>
  {@render children()}
</span>
