<!--
  Administration : toutes les réservations (`/admin/reservations`).
  Liste paginée, la plus récente d'abord, filtrable par statut (`?statut=`), par client
  (`?utilisateur=`, depuis la gestion des utilisateurs ou le classement des clients) et par salle
  (`?salle=`, depuis le classement des salles). Adresse partageable.

  - Données : `listReservations` (GraphQL `reservations`) : une requête par page, avec le nom de la
    salle et du client.
  - Actions : Confirmer et Refuser (avec motif facultatif) sur une demande en attente, Annuler sur
    une réservation en attente ou confirmée. La mutation renvoie la réservation à jour, qui
    remplace la ligne.
-->
<script lang="ts">
  import type {
    AdminReservationFieldsFragment,
    ReservationStatus,
  } from '@room-booking/core/graphql';
  import { onMount, tick } from 'svelte';
  import Alert from '../../components/Alert.svelte';
  import Button from '../../components/Button.svelte';
  import EmptyState from '../../components/EmptyState.svelte';
  import ErrorState from '../../components/ErrorState.svelte';
  import Field from '../../components/Field.svelte';
  import Icon from '../../components/Icon.svelte';
  import Modal from '../../components/Modal.svelte';
  import Pagination from '../../components/Pagination.svelte';
  import SegmentedNav from '../../components/SegmentedNav.svelte';
  import Skeleton from '../../components/Skeleton.svelte';
  import StatusBadge from '../../components/StatusBadge.svelte';
  import Textarea from '../../components/Textarea.svelte';
  import {
    cancelReservation,
    confirmReservation,
    listReservations,
    rejectReservation,
  } from '../../data/admin/admin.queries';
  import { errorMessage } from '../../data/errors';
  import { formatDateRange } from '../../utils/dates';
  import { formatPrice } from '../../utils/formatPrice';
  import {
    ADMIN_PAGE_SIZE,
    fullName,
    listHref,
    parseId,
    parsePage,
    parseStatus,
    STATUS_LABELS,
    STATUSES,
  } from './admin';
  import * as t from './table';

  type Reservation = AdminReservationFieldsFragment;

  const PATH = '/admin/reservations';
  const NO_LONGER = 'Cette réservation a changé de statut entre-temps : rechargez la liste.';

  type LoadState =
    | { type: 'loading' }
    | { type: 'error'; message: string }
    | { type: 'ready'; reservations: Reservation[]; total: number };

  let load = $state<LoadState>({ type: 'loading' });
  let status = $state<ReservationStatus | null>(null);
  let userId = $state<string | null>(null);
  let roomId = $state<string | null>(null);
  let page = $state(1);

  let feedback = $state<{ variant: 'success' | 'danger'; message: string } | null>(null);
  let feedbackRegion = $state<HTMLDivElement>();
  let confirmingId = $state<string | null>(null);

  /** Action confirmée dans la modale : refus (avec motif) ou annulation. */
  let pendingAction = $state<{ type: 'reject' | 'cancel'; reservation: Reservation } | null>(null);
  let actionOpen = $state(false);
  let reason = $state('');
  let acting = $state(false);
  let actionError = $state<string | null>(null);

  /** Filtres courants, pour les adresses (navigation, pagination, retrait d'un filtre). */
  const filters = $derived({ statut: status, utilisateur: userId, salle: roomId });

  async function fetchReservations() {
    load = { type: 'loading' };
    const result = await listReservations({
      filter: { status, userId, roomId },
      page,
      pageSize: ADMIN_PAGE_SIZE,
    });
    load = result.ok
      ? {
          type: 'ready',
          reservations: result.data.reservations.items,
          total: result.data.reservations.total,
        }
      : { type: 'error', message: errorMessage(result.error) };
  }

  onMount(() => {
    const params = new URL(location.href).searchParams;
    status = parseStatus(params.get('statut'));
    userId = parseId(params.get('utilisateur'));
    roomId = parseId(params.get('salle'));
    page = parsePage(params.get('page'));
    void fetchReservations();
  });

  const navItems = $derived([
    { label: 'Toutes', href: listHref(PATH, { ...filters, statut: null }), current: !status },
    ...STATUSES.map((value) => ({
      label: STATUS_LABELS[value],
      href: listHref(PATH, { ...filters, statut: value }),
      current: status === value,
    })),
  ]);

  // Noms des filtres client et salle, lus sur la première réservation de la liste
  const first = $derived(load.type === 'ready' ? load.reservations[0] : undefined);
  const userFilterName = $derived(first ? fullName(first.requester) : 'ce client');
  const roomFilterName = $derived(first ? first.room.name : 'cette salle');

  async function showFeedback(variant: 'success' | 'danger', message: string) {
    feedback = { variant, message };
    await tick();
    feedbackRegion?.focus();
  }

  function replaceReservation(updated: Reservation) {
    if (load.type !== 'ready') return;
    load = {
      ...load,
      reservations: load.reservations.map((r) => (r.id === updated.id ? updated : r)),
    };
  }

  const describe = (r: Reservation) => `${r.room.name}, ${formatDateRange(r.startAt, r.endAt)}`;

  async function confirm(reservation: Reservation) {
    if (confirmingId) return;
    confirmingId = reservation.id;
    feedback = null;
    const result = await confirmReservation(reservation.id);
    confirmingId = null;
    if (!result.ok) {
      await showFeedback('danger', errorMessage(result.error, { 409: NO_LONGER }));
      return;
    }
    replaceReservation(result.data.confirmReservation);
    await showFeedback(
      'success',
      `Réservation de ${fullName(reservation.requester)} confirmée (${describe(reservation)}).`,
    );
  }

  function ask(type: 'reject' | 'cancel', reservation: Reservation) {
    pendingAction = { type, reservation };
    reason = '';
    actionError = null;
    actionOpen = true;
  }

  async function runAction() {
    if (!pendingAction || acting) return;
    const { type, reservation } = pendingAction;
    acting = true;
    actionError = null;
    const motive = reason.trim();
    const result =
      type === 'reject'
        ? await rejectReservation(reservation.id, motive === '' ? undefined : motive)
        : await cancelReservation(reservation.id);
    acting = false;
    if (!result.ok) {
      actionError = errorMessage(result.error, { 409: NO_LONGER });
      return;
    }
    actionOpen = false;
    replaceReservation(
      'rejectReservation' in result.data
        ? result.data.rejectReservation
        : result.data.cancelReservation,
    );
    const done = type === 'reject' ? 'refusée' : 'annulée';
    await showFeedback(
      'success',
      `Réservation de ${fullName(reservation.requester)} ${done} (${describe(reservation)}).`,
    );
  }
</script>

<SegmentedNav label="Filtrer par statut" items={navItems} class="mb-(--space-4)" />

{#if userId || roomId}
  <div class="mb-(--space-5) flex flex-wrap gap-(--space-2)">
    {#if userId}
      <Button
        variant="secondary"
        size="sm"
        href={listHref(PATH, { ...filters, utilisateur: null })}
      >
        Client : {userFilterName}
        <Icon name="x" />
        <span class="visually-hidden">(retirer ce filtre)</span>
      </Button>
    {/if}
    {#if roomId}
      <Button variant="secondary" size="sm" href={listHref(PATH, { ...filters, salle: null })}>
        Salle : {roomFilterName}
        <Icon name="x" />
        <span class="visually-hidden">(retirer ce filtre)</span>
      </Button>
    {/if}
  </div>
{/if}

{#if feedback}
  <div bind:this={feedbackRegion} tabindex="-1" class="mb-(--space-5) rounded-md">
    <Alert variant={feedback.variant}><p>{feedback.message}</p></Alert>
  </div>
{/if}

{#if load.type === 'loading'}
  <div class="flex flex-col gap-(--space-3)" aria-busy="true">
    <p class="visually-hidden" role="status">Chargement des réservations…</p>
    {#each [0, 1, 2, 3] as line (line)}
      <Skeleton class="h-14! w-full rounded-lg!" />
    {/each}
  </div>
{:else if load.type === 'error'}
  <ErrorState
    title="Les réservations n'ont pas pu être chargées"
    message={load.message}
    headingLevel={2}
    onretry={fetchReservations}
  />
{:else if load.reservations.length === 0}
  <EmptyState
    title="Aucune réservation"
    text="Aucune réservation ne correspond à ces filtres."
    icon="calendar"
    headingLevel={2}
  >
    {#snippet action()}
      {#if status || userId || roomId}
        <Button variant="secondary" href={PATH}>Voir toutes les réservations</Button>
      {/if}
    {/snippet}
  </EmptyState>
{:else}
  <p class="mb-(--space-3) text-text-muted" role="status">
    {load.total}
    {load.total > 1 ? 'réservations' : 'réservation'}
  </p>
  <div class={t.tableFrame}>
    <table class={t.tableClass}>
      <caption class="visually-hidden">Réservations</caption>
      <thead class={t.headClass}>
        <tr>
          <th scope="col" class={t.headCell}>Créneau</th>
          <th scope="col" class={t.headCell}>Salle</th>
          <th scope="col" class={t.headCell}>Client</th>
          <th scope="col" class={[t.headCell, 'text-right']}>Montant</th>
          <th scope="col" class={t.headCell}>Statut</th>
          <th scope="col" class={t.headCell}><span class="visually-hidden">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {#each load.reservations as reservation (reservation.id)}
          <tr class={t.row}>
            <th scope="row" class={[t.cell, 'font-semibold max-md:pb-(--space-2)']}>
              {formatDateRange(reservation.startAt, reservation.endAt)}
            </th>
            <td class={[t.cell, t.labelled]} data-label="Salle">
              <a
                class="md:whitespace-nowrap"
                href={listHref(PATH, { ...filters, salle: reservation.room.id, page: null })}
              >
                {reservation.room.name}
              </a>
            </td>
            <td class={[t.cell, t.labelled]} data-label="Client">
              <a
                class="md:whitespace-nowrap"
                href={listHref(PATH, {
                  ...filters,
                  utilisateur: reservation.requester.id,
                  page: null,
                })}>{fullName(reservation.requester)}</a
              >
            </td>
            <td class={[t.cell, t.labelled, t.numeric]} data-label="Montant">
              {formatPrice(reservation.totalAmount)}
            </td>
            <td class={[t.cell, t.labelled]} data-label="Statut">
              <span class="flex flex-col items-end gap-(--space-1) md:items-start">
                <StatusBadge status={reservation.status} />
                {#if reservation.rejectionReason}
                  <span class="text-xs text-text-muted">Motif : {reservation.rejectionReason}</span>
                {/if}
              </span>
            </td>
            <td class={[t.cell, t.actionsCell]}>
              <span class="flex flex-wrap items-center justify-end gap-(--space-2)">
                {#if reservation.status === 'PENDING'}
                  <Button
                    needsNetwork
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
                  <Button variant="secondary" size="sm" onclick={() => ask('reject', reservation)}>
                    <Icon name="x" />
                    Refuser
                  </Button>
                {/if}
                {#if reservation.status === 'PENDING' || reservation.status === 'CONFIRMED'}
                  <Button variant="ghost" size="sm" onclick={() => ask('cancel', reservation)}>
                    Annuler
                    <span class="visually-hidden">la réservation ({describe(reservation)})</span>
                  </Button>
                {/if}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <Pagination
    {page}
    pageSize={ADMIN_PAGE_SIZE}
    total={load.total}
    hrefFor={(p) => listHref(PATH, { ...filters, page: p })}
    itemLabel="Réservations"
  />
{/if}

<Modal
  bind:open={actionOpen}
  title={pendingAction?.type === 'reject' ? 'Refuser la demande ?' : 'Annuler la réservation ?'}
  onclose={() => {
    pendingAction = null;
    actionError = null;
  }}
>
  {#if pendingAction}
    <p>
      <strong>{pendingAction.reservation.room.name}</strong>,
      {formatDateRange(pendingAction.reservation.startAt, pendingAction.reservation.endAt)}, pour
      {fullName(pendingAction.reservation.requester)}.
    </p>
    {#if pendingAction.type === 'cancel'}
      <p>Le créneau redevient disponible. Cette action est définitive.</p>
    {/if}
    {#if actionError}
      <Alert variant="danger"><p>{actionError}</p></Alert>
    {/if}
    {#if pendingAction.type === 'reject'}
      <Field label="Motif (facultatif)" id="admin-reject-reason" hint="Visible par le client.">
        {#snippet children(attrs)}
          <Textarea {...attrs} rows={3} maxlength={1000} bind:value={reason} />
        {/snippet}
      </Field>
    {/if}
  {/if}
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (actionOpen = false)}>Conserver</Button>
    <Button
      needsNetwork
      variant="danger"
      aria-disabled={acting}
      aria-busy={acting}
      onclick={() => {
        void runAction();
      }}
    >
      {pendingAction?.type === 'reject' ? 'Refuser la demande' : 'Annuler la réservation'}
    </Button>
  {/snippet}
</Modal>
