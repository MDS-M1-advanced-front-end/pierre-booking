<!--
  Modale de confirmation (maquette : composants.html § Modal, écran 06).
  `<dialog>` natif ouvert avec `showModal()` : focus piégé, fond inerte, Échap ferme.
  `open` est synchronisé dans les deux sens : le passer à `false` ferme la modale, et une fermeture
  native (Échap, bouton Fermer, `form method="dialog"`) le repasse à `false` puis appelle `onclose`.
  À la fermeture, le focus revient à l'élément qui l'avait à l'ouverture (le bouton déclencheur).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    /** Modale ouverte (`bind:open`). */
    open?: boolean;
    /** Titre affiché en `<h2>` et nom accessible du dialogue. */
    title: string;
    /** Corps de la modale. */
    children?: Snippet;
    /** Boutons d'action, alignés à droite (pleine largeur sur mobile). */
    footer?: Snippet;
    /** Appelé après chaque fermeture, quelle qu'en soit la cause. */
    onclose?: () => void;
  }

  let { open = $bindable(false), title, children, footer, onclose }: Props = $props();

  const titleId = $props.id();
  let dialog = $state<HTMLDialogElement>();
  // Élément qui avait le focus à l'ouverture, pour le lui rendre à la fermeture.
  let opener: HTMLElement | null = null;

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  // Événement `close` natif : fermeture par Échap, par `dialog.close()` ou par un formulaire.
  function handleClose() {
    open = false;
    if (opener?.isConnected) opener.focus();
    opener = null;
    onclose?.();
  }
</script>

<dialog
  bind:this={dialog}
  aria-labelledby={titleId}
  onclose={handleClose}
  class={[
    'm-auto w-[min(32rem,calc(100vw-2*var(--space-4)))] max-h-[calc(100dvh-2*var(--space-4))]',
    'rounded-lg border-0 bg-surface p-0 text-text shadow-lg backdrop:bg-(--color-overlay)',
    // Apparition en fondu ; sans effet si l'utilisateur demande moins d'animations.
    'opacity-0 open:opacity-100 starting:open:opacity-0',
    'motion-safe:transition-[opacity,display,overlay] motion-safe:transition-discrete',
    'motion-safe:duration-(--duration-fast) motion-safe:ease-(--easing-standard)',
  ]}
>
  <div class="flex items-start justify-between gap-(--space-4) px-(--space-5) pt-(--space-5)">
    <h2 id={titleId} class="text-lg">{title}</h2>
    <Button variant="ghost" size="sm" iconOnly onclick={() => (open = false)}>
      <Icon name="x" />
      <span class="visually-hidden">Fermer</span>
    </Button>
  </div>
  <div class="flex flex-col gap-(--space-3) px-(--space-5) py-(--space-4)">
    {@render children?.()}
  </div>
  {#if footer}
    <div
      class="flex flex-wrap-reverse justify-end gap-(--space-3) px-(--space-5) pb-(--space-5) max-md:*:flex-[1_1_100%]"
    >
      {@render footer()}
    </div>
  {/if}
</dialog>
