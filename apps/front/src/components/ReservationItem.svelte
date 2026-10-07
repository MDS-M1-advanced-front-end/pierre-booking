<!--
  Ligne d'une liste de réservations (maquette : écrans 06 et 11, `.res-item`).
  Rend un `<li>` : à placer directement dans une `<ul>` (liste `.res-list` :
  `flex flex-col gap-(--space-3)`). Bloc date décoratif (`aria-hidden`, la date complète est dans
  la ligne d'informations), nom de la salle en `h3` lien, statut, horaire, participants, montant,
  demandeur éventuel, commentaire et zone d'actions.
-->
<script lang="ts">
  import type { Reservation } from '@room-booking/core';
  import type { Snippet } from 'svelte';
  import { formatDayMonth, formatShortDate, formatTime } from '../utils/dates';
  import { formatPrice } from '../utils/formatPrice';
  import Icon from './Icon.svelte';
  import StatusBadge from './StatusBadge.svelte';

  interface Props {
    reservation: Reservation;
    /** Nom de la salle (« Salle inconnue » si elle n'a pas pu être chargée). */
    roomName: string;
    /** Destination du lien du nom ; par défaut la fiche de la salle. */
    roomHref?: string;
    /** Nom du demandeur, affiché « Demande de **Nom** » (écran 11). */
    requesterName?: string;
    /** Réservation passée, refusée ou annulée : fond atténué. */
    past?: boolean;
    /** Boutons d'action (Modifier, Annuler, Confirmer…). */
    actions?: Snippet;
  }

  let { reservation, roomName, roomHref, requesterName, past = false, actions }: Props = $props();

  const href = $derived(roomHref ?? `/salles/${reservation.roomId}`);
  const dayMonth = $derived(formatDayMonth(reservation.startAt));
  const schedule = $derived(
    `${formatShortDate(reservation.startAt)} · ${formatTime(reservation.startAt)} – ${formatTime(reservation.endAt)}`,
  );
  const participants = $derived(reservation.numberOfParticipants);
</script>

<li
  class={[
    'grid gap-(--space-3) rounded-lg border border-border p-(--space-4)',
    'md:grid-cols-[5rem_minmax(0,1fr)_auto] md:items-center md:px-(--space-5)',
    past ? 'res-item--past bg-bg' : 'bg-surface',
  ]}
>
  <p
    class={[
      'flex items-baseline gap-(--space-2) text-action',
      'md:flex-col md:items-center md:gap-0 md:rounded-md md:bg-action-subtle md:p-(--space-2)',
    ]}
    aria-hidden="true"
  >
    <span class="text-xl leading-none font-bold">{dayMonth.day}</span>
    <span class="text-sm font-semibold uppercase">{dayMonth.month}</span>
  </p>

  <div class="flex flex-col gap-(--space-1)">
    <div class="flex flex-wrap items-center gap-(--space-2)">
      <h3 class="text-md"><a {href}>{roomName}</a></h3>
      <StatusBadge status={reservation.status} />
    </div>
    <p class="flex flex-wrap gap-x-(--space-4) gap-y-(--space-1) text-sm text-text-muted">
      <span class="inline-flex items-center gap-(--space-1)">
        <Icon name="calendar" />
        {schedule}
      </span>
      {#if participants !== undefined}
        <span class="inline-flex items-center gap-(--space-1)">
          <Icon name="users" />
          {participants}
          {participants > 1 ? 'participants' : 'participant'}
        </span>
      {/if}
      <span class="inline-flex items-center gap-(--space-1)">
        <Icon name="euro" />
        {formatPrice(reservation.totalAmount)}
      </span>
    </p>
    {#if requesterName}
      <p class="text-sm">Demande de <strong>{requesterName}</strong></p>
    {/if}
    {#if reservation.comment}
      <p class="text-sm text-text-muted">« {reservation.comment} »</p>
    {/if}
  </div>

  {#if actions}
    <div class="flex flex-wrap gap-(--space-2)">
      {@render actions()}
    </div>
  {/if}
</li>
