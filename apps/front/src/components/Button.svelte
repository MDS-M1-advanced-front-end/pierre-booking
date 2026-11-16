<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
  import { network } from '../data/offline/network.svelte';

  type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

  interface Props extends Omit<
    HTMLButtonAttributes & HTMLAnchorAttributes,
    'type' | 'class' | 'href' | 'disabled' | 'children'
  > {
    variant?: Variant;
    size?: 'md' | 'sm';
    /** Bouton carré ne contenant qu'une icône : prévoir un texte `visually-hidden`. */
    iconOnly?: boolean;
    /** Pleine largeur. */
    block?: boolean;
    /** Rend un lien `<a>` stylé en bouton. */
    href?: string;
    type?: 'button' | 'submit';
    disabled?: boolean;
    /**
     * Action qui a besoin du réseau (réserver, enregistrer…) : hors ligne, le bouton est inactif
     * (`aria-disabled`, il reste atteignable et annonce « hors ligne ») et le clic est sans effet.
     */
    needsNetwork?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    iconOnly = false,
    block = false,
    href,
    type = 'button',
    disabled = false,
    needsNetwork = false,
    class: className,
    children,
    ...rest
  }: Props = $props();

  // Couleurs de chaque variante (maquette.css, .btn--*), appliquées hors état désactivé.
  // Chaque variante porte sa couleur de bordure : deux utilitaires `border-*` concurrents
  // seraient départagés par l'ordre de la feuille générée, pas par l'ordre des classes.
  const variantClasses: Record<Variant, string> = {
    primary:
      'border-transparent bg-action text-on-action hover:bg-action-hover active:bg-action-active',
    secondary:
      'border-border-strong bg-surface text-action hover:bg-action-subtle active:bg-action-subtle-hover',
    ghost: 'border-transparent bg-transparent text-action hover:bg-action-subtle',
    danger: 'border-transparent bg-danger text-text-inverse hover:bg-danger-hover',
  };

  const offline = $derived(needsNetwork && !network.online);

  // `aria-disabled` (ex. bouton en cours d'envoi) prend le même aspect que `disabled`.
  const inactive = $derived(
    disabled || offline || rest['aria-disabled'] === true || rest['aria-disabled'] === 'true',
  );

  /** Hors ligne, le clic (et l'envoi du formulaire pour un bouton `submit`) est annulé. */
  function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
    if (offline) {
      event.preventDefault();
      return;
    }
    rest.onclick?.(event);
  }

  const classes = $derived([
    'inline-flex items-center justify-center gap-(--space-2) rounded-md border',
    'leading-none font-semibold no-underline',
    'transition-[background-color,border-color] duration-(--duration-fast) ease-(--easing-standard)',
    size === 'md' ? 'min-h-(--size-control)' : 'min-h-(--size-control-sm) text-sm',
    iconOnly
      ? ['px-0', size === 'md' ? 'w-(--size-control)' : 'w-(--size-control-sm)']
      : size === 'md'
        ? 'px-(--space-4)'
        : 'px-(--space-3)',
    block && 'w-full',
    inactive
      ? 'cursor-not-allowed border-border bg-surface-muted text-text-muted'
      : ['cursor-pointer', variantClasses[variant]],
    rest['aria-busy'] === true || rest['aria-busy'] === 'true' ? 'cursor-progress' : '',
    className,
  ]);
</script>

{#if href !== undefined}
  <!-- Un lien désactivé n'a plus de href : il n'est plus activable ni atteignable au clavier. -->
  <a
    {...rest}
    class={classes}
    href={disabled ? undefined : href}
    role={disabled ? 'link' : rest.role}
    aria-disabled={disabled ? 'true' : rest['aria-disabled']}
  >
    {@render children?.()}
  </a>
{:else}
  <button
    {...rest}
    class={classes}
    {type}
    {disabled}
    aria-disabled={offline ? 'true' : rest['aria-disabled']}
    onclick={handleClick}
  >
    {@render children?.()}
    {#if offline}<span class="visually-hidden">(indisponible hors ligne)</span>{/if}
  </button>
{/if}
