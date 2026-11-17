<!--
  Bandeaux de la PWA, sur toutes les pages (Layout) :
  - « Vous êtes hors ligne » tant que le réseau manque : la page montre la dernière version vue,
    les actions sont indisponibles (règle : consultation hors ligne, actions en ligne) ;
  - l'issue des demandes de réservation faites hors ligne (envoyée, ou refusée avec le motif),
    jusqu'à ce que l'utilisateur ferme le message.
  Enregistre aussi le service worker (mise à jour automatique : la page se recharge quand une
  nouvelle version prend la main) et lance l'envoi des demandes en attente (maintenant et à
  chaque retour de la connexion). Rendu dans le navigateur seulement (`client:only`).
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { session } from '../data/auth/session.svelte';
  import { network, watchNetwork } from '../data/offline/network.svelte';
  import { dismissNotice, outbox } from '../data/offline/outbox.svelte';
  import { registerServiceWorker } from '../data/offline/serviceWorker';
  import { watchPendingReservations } from '../data/reservations/pendingReservations';
  import { formatDateRange } from '../utils/dates';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  onMount(() => {
    watchNetwork();
    registerServiceWorker();
    watchPendingReservations();
  });

  /** Issues des demandes envoyées depuis la file, pour le compte connecté. */
  const notices = $derived(outbox.notices.filter((notice) => notice.userId === session.user?.id));

  const bar =
    'flex flex-wrap items-center justify-center gap-(--space-2) px-(--space-4) py-(--space-2) text-center text-sm';
</script>

<!-- Région toujours présente : son contenu est annoncé par les lecteurs d'écran quand il change. -->
<div role="status">
  {#if !network.online}
    <p class={[bar, 'm-0 bg-warning-bg text-warning-text']}>
      <Icon name="alert" />
      <span>
        <strong>Vous êtes hors ligne.</strong> Vous consultez la dernière version enregistrée. Vos demandes
        de réservation seront envoyées au retour de la connexion ; les autres actions reprendront alors.
      </span>
    </p>
  {/if}
  {#each notices as notice (notice.id)}
    <div
      class={[
        bar,
        notice.kind === 'sent'
          ? 'bg-success-bg text-success-text'
          : 'bg-danger-bg text-danger-text',
      ]}
    >
      <Icon name={notice.kind === 'sent' ? 'check' : 'alert'} />
      <span>
        {#if notice.kind === 'sent'}
          Votre demande pour <strong>{notice.roomName}</strong>
          ({formatDateRange(notice.startAt, notice.endAt)}) a été envoyée au gestionnaire.
        {:else}
          Votre demande pour <strong>{notice.roomName}</strong>
          ({formatDateRange(notice.startAt, notice.endAt)}) n'a pas pu être envoyée. {notice.reason}
        {/if}
      </span>
      <Button
        size="sm"
        variant="secondary"
        aria-label={`Fermer le message sur la demande pour ${notice.roomName}`}
        onclick={() => {
          dismissNotice(notice.id);
        }}
      >
        Fermer
      </Button>
    </div>
  {/each}
</div>
