<!--
  Erreur de chargement d'une liste (maquette : composants.html § États, « Erreur de chargement »).
  Le titre et le message sont annoncés (`role="alert"`) ; le bouton « Réessayer » n'apparaît que si
  `onretry` est fourni.
-->
<script lang="ts">
  import Button from './Button.svelte';
  import EmptyState from './EmptyState.svelte';

  interface Props {
    /** Ex. « Les salles n'ont pas pu être chargées ». */
    title?: string;
    message?: string;
    headingLevel?: 2 | 3 | 4;
    /** Relance le chargement ; sans ce callback, pas de bouton. */
    onretry?: () => void;
    class?: string;
  }

  let {
    title = "Les données n'ont pas pu être chargées",
    message = 'Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.',
    headingLevel = 3,
    onretry,
    class: className,
  }: Props = $props();
</script>

<EmptyState
  {title}
  text={message}
  icon="alert"
  {headingLevel}
  role="alert"
  class={className}
  action={onretry ? retry : undefined}
/>

{#snippet retry()}
  <Button onclick={onretry}>Réessayer</Button>
{/snippet}
