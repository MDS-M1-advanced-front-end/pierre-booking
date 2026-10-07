<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon, { type IconName } from './Icon.svelte';

  type Variant = 'danger' | 'success' | 'info';

  interface Props {
    variant: Variant;
    title?: string;
    children?: Snippet;
  }

  let { variant, title, children }: Props = $props();

  // Couleurs, icône et rôle ARIA par variante (maquette.css, .alert--* ; composants.html § Alert) :
  // une erreur bloquante est annoncée tout de suite (alert), une confirmation poliment (status).
  const variants: Record<
    Variant,
    { classes: string; icon: IconName; role: 'alert' | 'status' | undefined }
  > = {
    danger: { classes: 'bg-danger-bg text-danger-text', icon: 'alert', role: 'alert' },
    success: { classes: 'bg-success-bg text-success-text', icon: 'ok', role: 'status' },
    info: { classes: 'bg-info-bg text-info-text', icon: 'info', role: undefined },
  };

  const config = $derived(variants[variant]);
</script>

<div
  class={[
    'flex gap-(--space-3) rounded-md border border-l-4 border-current px-(--space-4) py-(--space-3)',
    config.classes,
  ]}
  role={config.role}
>
  <Icon name={config.icon} class="mt-[0.125rem]" />
  <div class="text-text">
    {#if title}
      <p class="font-bold">{title}</p>
    {/if}
    {@render children?.()}
  </div>
</div>
