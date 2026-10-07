<!--
  Écran 11 « Demandes » (maquette : ecrans/11-demandes.html ; cadrage.md § 4 « 11 »).
  Demandes de réservation sur les salles du gestionnaire : « En attente » (Confirmer / Refuser) et
  « Traitées récemment ».

  - Données : `listMyReservations()`. Hypothèse (anomalie 4, à faire confirmer par le module
    Back-end) : pour un GESTIONNAIRE, `GET /reservations` renvoie les réservations de ses salles.
    Par prudence, la liste est filtrée sur ses salles (`listRoomsOfOwner`) quand elles ont pu être
    chargées (voir `requests.ts`).
  - Noms : salles connues par `listRoomsOfOwner`, sinon `getRoomsByIds` (« Salle inconnue » en cas
    d'erreur) ; demandeurs par `getUsersByIds` (droits de `GET /users/{id}` non précisés : « Client »
    en cas d'erreur). Un seul appel par identifiant distinct (anomalie 8).
  - Actions : `confirmReservation(id)` ; `rejectReservation(id, { reason })` après la modale, sans
    `reason` si le motif est vide. La demande passe alors en tête des « Traitées récemment » et une
    confirmation (`role="status"`) prend le focus.

  Props :
    user: User   utilisateur connecté (fourni par `RequireAuth`)
-->
<script lang="ts">
  import type { Reservation, Room, User } from '@room-booking/core';
  import { onMount, tick } from 'svelte';
  import Alert from '../../components/Alert.svelte';
  import Button from '../../components/Button.svelte';
  import EmptyState from '../../components/EmptyState.svelte';
  import ErrorState from '../../components/ErrorState.svelte';
  import Field from '../../components/Field.svelte';
  import Icon from '../../components/Icon.svelte';
  import Modal from '../../components/Modal.svelte';
  import ReservationItem from '../../components/ReservationItem.svelte';
  import Skeleton from '../../components/Skeleton.svelte';
  import Textarea from '../../components/Textarea.svelte';
  import { errorMessage } from '../../data/errors';
  import {
    confirmReservation,
    listMyReservations,
    rejectReservation,
  } from '../../data/reservations/reservations.queries';
  import { getRoomsByIds } from '../../data/rooms/roomNames';
  import { listRoomsOfOwner } from '../../data/rooms/rooms.queries';
  import { getUsersByIds } from '../../data/users/userNames';
  import { formatDateRange, TIME_ZONE } from '../../utils/dates';
  import { markHandled, splitRequests } from './requests';

  interface Props {
    user: User;
  }

  let { user }: Props = $props();

  /** Taille de page maximale de l'API. */
  const PAGE_SIZE = 100;
  const ALREADY_HANDLED = 'Cette demande a déjà été traitée.';

  type LoadState = { type: 'loading' } | { type: 'error'; message: string } | { type: 'ready' };

  let loadState = $state<LoadState>({ type: 'loading' });
  let pending = $state<Reservation[]>([]);
  let handled = $state<Reservation[]>([]);
  let rooms = $state.raw(new Map<string, Room>());
  let users = $state.raw(new Map<string, User>());

  /** Retour d'une action (confirmation ou erreur), focalisé après l'action. */
  let feedback = $state<{ variant: 'success' | 'danger'; message: string } | null>(null);
  let feedbackRegion = $state<HTMLDivElement>();
  /** Demande dont la confirmation est en cours. */
  let confirmingId = $state<string | null>(null);

  /** Demande à refuser (modale). */
  let toReject = $state<Reservation | null>(null);
  let rejectOpen = $state(false);
  let reason = $state('');
  let rejecting = $state(false);
  let rejectError = $state<string | null>(null);

  // « 9 octobre » (heure de Paris), pour les messages de confirmation.
  const dayMonthFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'long',
  });

  const roomName = (r: Reservation) => rooms.get(r.roomId)?.name ?? 'Salle inconnue';

  function requesterName(r: Reservation): string {
    const requester = users.get(r.userId);
    return requester ? `${requester.firstName} ${requester.lastName}` : 'Client';
  }

  /** « (Bureau Oberkampf, 9 octobre) » */
  const where = (r: Reservation) =>
    `(${roomName(r)}, ${dayMonthFormat.format(new Date(r.startAt))})`;

  async function load() {
    loadState = { type: 'loading' };
    feedback = null;
    const [reservations, ownRooms] = await Promise.all([
      listMyReservations({ pageSize: PAGE_SIZE }),
      user.role === 'GESTIONNAIRE' ? listRoomsOfOwner(user.id) : Promise.resolve(null),
    ]);
    if (!reservations.ok) {
      loadState = { type: 'error', message: errorMessage(reservations.error) };
      return;
    }
    const known = new Map(ownRooms?.ok ? ownRooms.data.map((room) => [room.id, room]) : []);
    const lists = splitRequests(
      reservations.data.items,
      ownRooms?.ok ? new Set(known.keys()) : null,
    );
    const shown = [...lists.pending, ...lists.handled];
    const [fetchedRooms, requesters] = await Promise.all([
      getRoomsByIds(shown.map((r) => r.roomId).filter((id) => !known.has(id))),
      getUsersByIds(shown.map((r) => r.userId)),
    ]);
    rooms = new Map([...known, ...fetchedRooms]);
    users = requesters;
    pending = lists.pending;
    handled = lists.handled;
    loadState = { type: 'ready' };
  }

  onMount(() => {
    void load();
  });

  async function showFeedback(variant: 'success' | 'danger', message: string) {
    feedback = { variant, message };
    await tick();
    feedbackRegion?.focus();
  }

  function applyHandled(reservation: Reservation, status: 'CONFIRMED' | 'REJECTED') {
    ({ pending, handled } = markHandled({ pending, handled }, reservation, status));
  }

  async function confirm(reservation: Reservation) {
    if (confirmingId) return;
    confirmingId = reservation.id;
    feedback = null;
    const result = await confirmReservation(reservation.id);
    confirmingId = null;
    if (!result.ok) {
      await showFeedback('danger', errorMessage(result.error, { 409: ALREADY_HANDLED }));
      return;
    }
    applyHandled(reservation, 'CONFIRMED');
    await showFeedback(
      'success',
      `Réservation de ${requesterName(reservation)} confirmée ${where(reservation)}.`,
    );
  }

  function askReject(reservation: Reservation) {
    toReject = reservation;
    reason = '';
    rejectError = null;
    rejectOpen = true;
  }

  async function reject() {
    const reservation = toReject;
    if (!reservation || rejecting) return;
    rejecting = true;
    rejectError = null;
    const motive = reason.trim();
    const result = await rejectReservation(
      reservation.id,
      motive === '' ? undefined : { reason: motive },
    );
    rejecting = false;
    if (!result.ok) {
      rejectError = errorMessage(result.error, { 409: ALREADY_HANDLED });
      return;
    }
    rejectOpen = false;
    applyHandled(reservation, 'REJECTED');
    feedback = null;
    await showFeedback(
      'success',
      `Demande de ${requesterName(reservation)} refusée ${where(reservation)}.`,
    );
  }

  const countClasses =
    'ml-(--space-1) inline-grid h-[1.375rem] min-w-[1.375rem] place-items-center rounded-full bg-accent px-(--space-1) align-middle text-xs font-bold text-on-accent';
</script>

{#if loadState.type === 'loading'}
  <div class="flex flex-col gap-(--space-3)" aria-busy="true">
    <p class="visually-hidden" role="status">Chargement des demandes…</p>
    <Skeleton class="h-7 w-1/4" />
    <Skeleton class="h-24! w-full rounded-lg!" />
    <Skeleton class="h-24! w-full rounded-lg!" />
  </div>
{:else if loadState.type === 'error'}
  <ErrorState
    title="Les demandes n'ont pas pu être chargées"
    message={loadState.message}
    headingLevel={2}
    onretry={load}
  />
{:else}
  <div class="flex flex-col gap-(--space-6)">
    {#if feedback}
      <div bind:this={feedbackRegion} tabindex="-1" class="rounded-md">
        <Alert variant={feedback.variant}><p>{feedback.message}</p></Alert>
      </div>
    {/if}

    <section class="flex flex-col gap-(--space-4)" aria-labelledby="pending-title">
      <h2 id="pending-title">
        En attente <span class={countClasses}>{pending.length}</span>
      </h2>
      {#if pending.length === 0}
        <EmptyState
          title="Aucune demande en attente"
          text="Les nouvelles demandes sur vos salles apparaîtront ici."
          icon="calendar"
        />
      {:else}
        <ul class="m-0 flex list-none flex-col gap-(--space-3) p-0">
          {#each pending as reservation (reservation.id)}
            <ReservationItem
              {reservation}
              roomName={roomName(reservation)}
              requesterName={requesterName(reservation)}
            >
              {#snippet actions()}
                <Button
                  size="sm"
                  aria-disabled={confirmingId !== null}
                  aria-busy={confirmingId === reservation.id}
                  onclick={() => {
                    void confirm(reservation);
                  }}
                >
                  <Icon name="check" />
                  {confirmingId === reservation.id ? 'Confirmation…' : 'Confirmer'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onclick={() => {
                    askReject(reservation);
                  }}
                >
                  <Icon name="x" />
                  Refuser
                </Button>
              {/snippet}
            </ReservationItem>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="flex flex-col gap-(--space-4)" aria-labelledby="handled-title">
      <h2 id="handled-title">Traitées récemment</h2>
      {#if handled.length === 0}
        <p class="text-text-muted">Aucune demande traitée récemment.</p>
      {:else}
        <ul class="m-0 flex list-none flex-col gap-(--space-3) p-0">
          {#each handled as reservation (reservation.id)}
            <ReservationItem
              {reservation}
              roomName={roomName(reservation)}
              requesterName={requesterName(reservation)}
              past={reservation.status !== 'CONFIRMED'}
            />
          {/each}
        </ul>
      {/if}
    </section>
  </div>
{/if}

<Modal bind:open={rejectOpen} title="Refuser la demande ?">
  {#if toReject}
    <p>
      <strong>{roomName(toReject)}</strong>, {formatDateRange(toReject.startAt, toReject.endAt)},
      pour {requesterName(toReject)}.
    </p>
    {#if rejectError}
      <Alert variant="danger"><p>{rejectError}</p></Alert>
    {/if}
    <Field label="Motif (facultatif)" id="reject-reason" hint="Envoyé avec le refus.">
      {#snippet children(attrs)}
        <Textarea {...attrs} rows={3} bind:value={reason} />
      {/snippet}
    </Field>
  {/if}
  {#snippet footer()}
    <Button
      variant="secondary"
      onclick={() => {
        rejectOpen = false;
      }}
    >
      Conserver la demande
    </Button>
    <Button
      variant="danger"
      aria-disabled={rejecting}
      aria-busy={rejecting}
      onclick={() => {
        void reject();
      }}
    >
      {rejecting ? 'Refus…' : 'Refuser la demande'}
    </Button>
  {/snippet}
</Modal>
