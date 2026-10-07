<!--
  Contenu de l'écran 06 Mes réservations (maquette : ecrans/06-mes-reservations.html).
  Filtre par statut dans l'URL (`?status=…`), sections « À venir » et « Passées, refusées ou
  annulées », noms des salles via `getRoomsByIds` (anomalie 8), annulation dans une modale.
  Messages de retour : `?created=1` (écran 02) et `?updated=1` (écran 07), retirés de l'URL après
  affichage pour qu'un rechargement ne les réaffiche pas.
-->
<script lang="ts">
  import type { Reservation, ReservationStatus, Room, User } from '@room-booking/core';
  import { onMount, tick } from 'svelte';
  import Alert from '../../components/Alert.svelte';
  import Button from '../../components/Button.svelte';
  import EmptyState from '../../components/EmptyState.svelte';
  import ErrorState from '../../components/ErrorState.svelte';
  import Icon from '../../components/Icon.svelte';
  import Modal from '../../components/Modal.svelte';
  import ReservationItem from '../../components/ReservationItem.svelte';
  import SegmentedNav from '../../components/SegmentedNav.svelte';
  import Skeleton from '../../components/Skeleton.svelte';
  import { errorMessage } from '../../data/errors';
  import {
    cancelReservation,
    listMyReservations,
  } from '../../data/reservations/reservations.queries';
  import { getRoomsByIds } from '../../data/rooms/roomNames';
  import { formatDateRange } from '../../utils/dates';

  interface Props {
    user: User;
  }

  let { user }: Props = $props();

  /** Onglets du filtre, dans l'ordre de la maquette. */
  const FILTERS: { label: string; status: ReservationStatus | null }[] = [
    { label: 'Toutes', status: null },
    { label: 'En attente', status: 'PENDING' },
    { label: 'Confirmées', status: 'CONFIRMED' },
    { label: 'Terminées', status: 'COMPLETED' },
    { label: 'Annulées', status: 'CANCELLED' },
    { label: 'Refusées', status: 'REJECTED' },
  ];

  const FLASH_MESSAGES = {
    created: 'Votre demande de réservation a été envoyée au gestionnaire de la salle.',
    updated: 'Votre réservation a été modifiée.',
  } as const;

  /** Taille de page maximale de l'API : toutes les réservations d'un client tiennent en une page. */
  const PAGE_SIZE = 100;

  let status = $state<ReservationStatus | null>(null);
  let reservations = $state<Reservation[]>([]);
  let rooms = $state(new Map<string, Room>());
  let loading = $state(true);
  let loadError = $state<string | null>(null);
  let flash = $state<string | null>(null);
  let flashElement = $state<HTMLElement>();

  // Annulation
  let toCancel = $state<Reservation | null>(null);
  let modalOpen = $state(false);
  let cancelling = $state(false);
  let cancelError = $state<string | null>(null);
  let cancelled = false;

  const navItems = $derived(
    FILTERS.map((filter) => ({
      label: filter.label,
      href: filter.status ? `/reservations?status=${filter.status}` : '/reservations',
      current: filter.status === status,
    })),
  );

  /** Réservation encore modifiable ou annulable : en attente ou confirmée, et pas commencée. */
  function isUpcoming(reservation: Reservation, now = Date.now()): boolean {
    return (
      (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') &&
      Date.parse(reservation.startAt) > now
    );
  }

  const upcoming = $derived(
    reservations
      .filter((reservation) => isUpcoming(reservation))
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)),
  );
  const past = $derived(
    reservations
      .filter((reservation) => !isUpcoming(reservation))
      .sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt)),
  );

  function roomName(reservation: Reservation): string {
    return rooms.get(reservation.roomId)?.name ?? 'Salle inconnue';
  }

  function parseStatus(value: string | null): ReservationStatus | null {
    return (
      FILTERS.find((filter) => filter.status !== null && filter.status === value)?.status ?? null
    );
  }

  async function load() {
    loading = true;
    loadError = null;
    const result = await listMyReservations(
      status ? { status, pageSize: PAGE_SIZE } : { pageSize: PAGE_SIZE },
    );
    if (!result.ok) {
      loadError = errorMessage(result.error);
      loading = false;
      return;
    }
    // L'API ne renvoie que les réservations de l'utilisateur, filtrées par statut. Le mock Prism,
    // lui, renvoie toujours toutes les réservations du jeu de données : on refiltre ici (sans effet
    // avec la vraie API).
    const items = result.data.items.filter(
      (reservation) =>
        reservation.userId === user.id && (status === null || reservation.status === status),
    );
    rooms = await getRoomsByIds(items.map((reservation) => reservation.roomId));
    reservations = items;
    loading = false;
  }

  onMount(() => {
    const url = new URL(location.href);
    status = parseStatus(url.searchParams.get('status'));

    if (url.searchParams.get('created') === '1') flash = FLASH_MESSAGES.created;
    else if (url.searchParams.get('updated') === '1') flash = FLASH_MESSAGES.updated;
    if (url.searchParams.has('created') || url.searchParams.has('updated')) {
      url.searchParams.delete('created');
      url.searchParams.delete('updated');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }

    void load();
  });

  function askCancel(reservation: Reservation) {
    toCancel = reservation;
    cancelError = null;
    modalOpen = true;
  }

  async function confirmCancel() {
    if (!toCancel || cancelling) return;
    const { id } = toCancel;
    cancelling = true;
    cancelError = null;
    const result = await cancelReservation(id);
    cancelling = false;
    if (!result.ok) {
      cancelError = errorMessage(result.error, {
        404: "Cette réservation n'existe plus.",
        409: 'Cette réservation ne peut plus être annulée.',
      });
      return;
    }
    // Le mock est sans état : on ne recharge pas la liste, on met la réservation à jour ici.
    reservations = reservations.map((reservation) =>
      reservation.id === id ? { ...reservation, status: 'CANCELLED' } : reservation,
    );
    flash = 'La réservation a été annulée.';
    cancelled = true;
    modalOpen = false;
  }

  // Le bouton « Annuler » qui a ouvert la modale disparaît après une annulation (la réservation
  // passe dans « Passées ») : le focus va alors sur le message de confirmation.
  async function handleModalClose() {
    if (cancelled) {
      cancelled = false;
      await tick();
      flashElement?.focus();
    }
  }
</script>

<SegmentedNav label="Filtrer par statut" items={navItems} />

{#if flash}
  <div bind:this={flashElement} tabindex="-1" class="mb-(--space-4) focus-visible:outline-none">
    <Alert variant="success"><p>{flash}</p></Alert>
  </div>
{/if}

{#if loading}
  <div class="flex flex-col gap-(--space-3)" aria-busy="true">
    <p class="visually-hidden" role="status">Chargement des réservations…</p>
    <Skeleton class="h-6 w-1/4" />
    {#each [1, 2, 3] as row (row)}
      <div
        class="flex gap-(--space-4) rounded-lg border border-border bg-surface p-(--space-4)"
        aria-hidden="true"
      >
        <Skeleton class="size-14 rounded-md" />
        <div class="flex flex-1 flex-col gap-(--space-2)">
          <Skeleton class="h-[1.125rem] w-2/5" />
          <Skeleton class="w-3/5" />
          <Skeleton class="w-1/4" />
        </div>
      </div>
    {/each}
  </div>
{:else if loadError}
  <ErrorState
    title="Vos réservations n'ont pas pu être chargées"
    message={loadError}
    headingLevel={2}
    onretry={load}
  />
{:else if reservations.length === 0}
  {#if status}
    <EmptyState
      title="Aucune réservation avec ce statut"
      text="Choisissez un autre statut ou affichez toutes vos réservations."
      icon="calendar"
      headingLevel={2}
    >
      {#snippet action()}
        <Button variant="secondary" href="/reservations">Voir toutes mes réservations</Button>
      {/snippet}
    </EmptyState>
  {:else}
    <EmptyState
      title="Aucune réservation"
      text="Vous n'avez encore réservé aucune salle."
      icon="calendar"
      headingLevel={2}
    >
      {#snippet action()}
        <Button href="/">Voir le catalogue</Button>
      {/snippet}
    </EmptyState>
  {/if}
{:else}
  <div class="flex flex-col gap-(--space-6)">
    {#if upcoming.length > 0}
      <section class="flex flex-col gap-(--space-4)" aria-labelledby="upcoming-title">
        <h2 id="upcoming-title">À venir</h2>
        <ul class="flex flex-col gap-(--space-3)">
          {#each upcoming as reservation (reservation.id)}
            <ReservationItem {reservation} roomName={roomName(reservation)}>
              {#snippet actions()}
                <Button variant="ghost" size="sm" href={`/reservations/${reservation.id}/modifier`}>
                  <Icon name="pencil" />
                  Modifier
                </Button>
                <Button variant="secondary" size="sm" onclick={() => askCancel(reservation)}>
                  Annuler
                </Button>
              {/snippet}
            </ReservationItem>
          {/each}
        </ul>
      </section>
    {/if}

    {#if past.length > 0}
      <section class="flex flex-col gap-(--space-4)" aria-labelledby="past-title">
        <h2 id="past-title">Passées, refusées ou annulées</h2>
        <ul class="flex flex-col gap-(--space-3)">
          {#each past as reservation (reservation.id)}
            <ReservationItem {reservation} roomName={roomName(reservation)} past />
          {/each}
        </ul>
      </section>
    {/if}
  </div>
{/if}

<Modal bind:open={modalOpen} title="Annuler cette réservation ?" onclose={handleModalClose}>
  {#if toCancel}
    <p>
      <strong>{roomName(toCancel)}</strong>, {formatDateRange(toCancel.startAt, toCancel.endAt)}.
    </p>
  {/if}
  <p class="text-text-muted">
    Le créneau sera libéré pour d'autres personnes. Cette action est définitive.
  </p>
  {#if cancelError}
    <Alert variant="danger"><p>{cancelError}</p></Alert>
  {/if}

  {#snippet footer()}
    <Button variant="secondary" onclick={() => (modalOpen = false)}>Conserver</Button>
    <Button
      variant="danger"
      aria-disabled={cancelling}
      aria-busy={cancelling}
      onclick={confirmCancel}
    >
      Annuler la réservation
    </Button>
  {/snippet}
</Modal>
