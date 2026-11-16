<!--
  Bandeaux de la PWA, sur toutes les pages (Layout) :
  - « Vous êtes hors ligne » tant que le réseau manque : la page montre la dernière version vue,
    les actions sont indisponibles (règle : consultation hors ligne, actions en ligne) ;
  - « Nouvelle version disponible » quand un nouveau service worker attend, avec un bouton pour
    l'activer (rechargement de la page).
  Enregistre aussi le service worker. Rendu dans le navigateur seulement (`client:only`).
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { network, watchNetwork } from '../data/offline/network.svelte';
  import { registerServiceWorker } from '../data/offline/serviceWorker';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  /** Active la nouvelle version ; `null` tant qu'aucune n'attend. */
  let applyUpdate = $state<(() => void) | null>(null);

  onMount(() => {
    watchNetwork();
    registerServiceWorker((apply) => {
      applyUpdate = apply;
    });
  });

  const bar =
    'flex flex-wrap items-center justify-center gap-(--space-2) px-(--space-4) py-(--space-2) text-center text-sm';
</script>

<!-- Région toujours présente : son contenu est annoncé par les lecteurs d'écran quand il change. -->
<div role="status">
  {#if !network.online}
    <p class={[bar, 'm-0 bg-warning-bg text-warning-text']}>
      <Icon name="alert" />
      <span>
        <strong>Vous êtes hors ligne.</strong> Vous consultez la dernière version enregistrée ; réserver
        et modifier reprendront au retour de la connexion.
      </span>
    </p>
  {/if}
  {#if applyUpdate}
    <div class={[bar, 'bg-action-subtle text-text']}>
      <span>Une nouvelle version de Quorum est disponible.</span>
      <Button size="sm" variant="secondary" onclick={() => applyUpdate?.()}>Recharger</Button>
    </div>
  {/if}
</div>
