<!--
  Écran 07 Modifier une réservation (cadrage.md § 4 « 07 », maquette 07-modifier-reservation.html).

  - Données : `getReservation(id)` (404 → « Réservation introuvable »), `getRoom(roomId)`, puis les
    créneaux du jour affiché (`getRoomAvailability`).
  - Seule une réservation `PENDING` ou `CONFIRMED` à venir se modifie ; sinon, message et retour.
  - Le `DatePager` démarre au jour (heure de Paris) de la réservation, dont la plage est présélectionnée.
    Ses créneaux restent sélectionnables même renvoyés « indisponibles » (décision 9), mais seulement
    ce jour-là. Changer de jour vide la sélection.
  - Pas d'estimation de prix (décision 10) : « Avant » montre le montant actuel `totalAmount`,
    « Après » l'horaire seul, « Durée » la durée et le tarif horaire.
  - `409` à l'envoi : alerte « Ce créneau n'est plus disponible », créneaux rechargés, participants
    et commentaire conservés. Succès : `/reservations?updated=1`.
-->
<script lang="ts">
  import type {
    AvailabilitySlot,
    Reservation,
    ReservationUpdateRequest,
    Room,
  } from '@room-booking/core';
  import { onMount, tick } from 'svelte';
  import Alert from '../../components/Alert.svelte';
  import Button from '../../components/Button.svelte';
  import DatePager from '../../components/DatePager.svelte';
  import EmptyState from '../../components/EmptyState.svelte';
  import ErrorState from '../../components/ErrorState.svelte';
  import Field from '../../components/Field.svelte';
  import Input from '../../components/Input.svelte';
  import Skeleton from '../../components/Skeleton.svelte';
  import SlotPicker from '../../components/SlotPicker.svelte';
  import StatusBadge from '../../components/StatusBadge.svelte';
  import Textarea from '../../components/Textarea.svelte';
  import { errorMessage } from '../../data/errors';
  import { getReservation, updateReservation } from '../../data/reservations/reservations.queries';
  import { getRoom, getRoomAvailability } from '../../data/rooms/rooms.queries';
  import {
    formatDateYmd,
    formatShortDate,
    formatTime,
    parisToUtcIso,
    shortTime,
    todayInParis,
    utcIsoToParis,
  } from '../../utils/dates';
  import { formatPrice } from '../../utils/formatPrice';
  import {
    EMPTY_SELECTION,
    selectionForTimes,
    selectionRange,
    withinTimes,
    type SlotSelection,
  } from '../../utils/slotSelection';
  import { fieldValidationMessage } from '../../utils/validationMessage';

  interface Props {
    reservationId: string;
  }

  let { reservationId }: Props = $props();

  type PageState =
    | { type: 'loading' }
    | { type: 'not-found' }
    | { type: 'error'; message: string }
    | { type: 'locked'; reservation: Reservation; room: Room }
    | { type: 'ready'; reservation: Reservation; room: Room };

  /** Plage d'origine de la réservation, en heure de Paris. */
  interface OriginalRange {
    date: string;
    startTime: string;
    endTime: string;
  }

  const EDITABLE_STATUSES = new Set<Reservation['status']>(['PENDING', 'CONFIRMED']);

  /** Modifiable : en attente ou confirmée, et pas encore commencée. */
  const isEditable = (reservation: Reservation) =>
    EDITABLE_STATUSES.has(reservation.status) && Date.parse(reservation.startAt) > Date.now();

  let page = $state<PageState>({ type: 'loading' });
  let original = $state<OriginalRange | null>(null);

  // Créneaux du jour affiché. `slotsDate` est le jour des créneaux chargés, `date` celui du
  // DatePager (qui change avant la fin du chargement).
  let date = $state('');
  let slotsDate = $state('');
  let slots = $state<AvailabilitySlot[]>([]);
  let slotsStatus = $state<'loading' | 'ready' | 'error'>('loading');
  let slotsError = $state('');
  let selection = $state<SlotSelection>(EMPTY_SELECTION);
  let slotsRequest = 0;

  // Formulaire.
  let participants = $state<number | null>(null);
  let comment = $state('');
  let participantsError = $state<string | null>(null);
  let selectionError = $state(false);
  let submitting = $state(false);
  let conflict = $state(false);
  let submitError = $state<string | null>(null);
  let conflictAlert = $state<HTMLDivElement>();

  const participantsRules = {
    subject: 'Le nombre de participants',
    unit: ['personne', 'personnes'],
  } as const;

  const today = todayInParis();

  // Les créneaux d'origine ne sont rendus sélectionnables que le jour de la réservation.
  const alsoSelectable = $derived(
    original && slotsDate === original.date
      ? withinTimes(original.startTime, original.endTime)
      : undefined,
  );
  const range = $derived(slotsStatus === 'ready' ? selectionRange(selection, slots) : null);
  const otherDay = $derived(original !== null && slotsDate !== '' && slotsDate !== original.date);

  async function load() {
    page = { type: 'loading' };
    const reservationResult = await getReservation(reservationId);
    if (!reservationResult.ok) {
      // Identifiant mal formé (400/422) : traité comme une réservation introuvable.
      const { status } = reservationResult.error;
      page =
        status === 404 || status === 400 || status === 422
          ? { type: 'not-found' }
          : { type: 'error', message: errorMessage(reservationResult.error) };
      return;
    }
    const reservation = reservationResult.data;
    const roomResult = await getRoom(reservation.roomId);
    if (!roomResult.ok) {
      page = { type: 'error', message: errorMessage(roomResult.error) };
      return;
    }
    const room = roomResult.data;
    if (!isEditable(reservation)) {
      page = { type: 'locked', reservation, room };
      return;
    }
    const start = utcIsoToParis(reservation.startAt);
    original = {
      date: start.date,
      startTime: start.time,
      endTime: utcIsoToParis(reservation.endAt).time,
    };
    participants = reservation.numberOfParticipants ?? 1;
    comment = reservation.comment ?? '';
    date = start.date;
    page = { type: 'ready', reservation, room };
    await loadSlots(room.id, start.date, true);
  }

  /**
   * Charge les créneaux de `day`. Seule la dernière demande est prise en compte.
   * @param preselect - Présélectionne la plage d'origine (premier affichage).
   */
  async function loadSlots(roomId: string, day: string, preselect = false) {
    const request = ++slotsRequest;
    slotsStatus = 'loading';
    selection = EMPTY_SELECTION;
    const result = await getRoomAvailability(roomId, { date: day });
    if (request !== slotsRequest) return;
    slotsDate = day;
    if (!result.ok) {
      slots = [];
      slotsError = errorMessage(result.error);
      slotsStatus = 'error';
      return;
    }
    slots = result.data;
    if (preselect && original) {
      selection = selectionForTimes(slots, original.startTime, original.endTime);
    }
    slotsStatus = 'ready';
  }

  onMount(() => {
    void load();
  });

  // Une nouvelle sélection efface le message « Choisissez un créneau ».
  $effect(() => {
    if (range) selectionError = false;
  });

  async function submit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (submitting || page.type !== 'ready') return;
    const { reservation } = page;
    conflict = false;
    submitError = null;
    const participantsInput = event.currentTarget.elements.namedItem('numberOfParticipants');
    participantsError =
      participantsInput instanceof HTMLInputElement
        ? fieldValidationMessage(participantsInput, participantsRules)
        : null;
    selectionError = range === null;
    if (participantsError) {
      (participantsInput as HTMLInputElement).focus();
      return;
    }
    if (!range || participants === null) return;

    submitting = true;
    const body: ReservationUpdateRequest = {
      startAt: parisToUtcIso(slotsDate, range.startTime),
      endAt: parisToUtcIso(slotsDate, range.endTime),
      numberOfParticipants: Number(participants),
      comment: comment.trim(),
    };
    const result = await updateReservation(reservation.id, body);
    if (result.ok) {
      location.assign('/reservations?updated=1');
      return;
    }
    submitting = false;
    if (result.error.status === 409) {
      conflict = true;
      // Le créneau vient d'être pris : on recharge la journée affichée, la saisie reste.
      void loadSlots(reservation.roomId, slotsDate);
      await tick();
      conflictAlert?.focus();
      conflictAlert?.scrollIntoView({ block: 'center' });
    } else {
      submitError = errorMessage(result.error);
    }
  }

  // Récapitulatif : le jour n'est précisé que si la réservation change de jour.
  const beforeText = $derived.by(() => {
    if (page.type !== 'ready') return '';
    const { startAt, endAt, totalAmount } = page.reservation;
    const times = `${formatTime(startAt)} – ${formatTime(endAt)} · ${formatPrice(totalAmount)}`;
    return otherDay ? `${formatShortDate(startAt)}, ${times}` : times;
  });
  const afterText = $derived.by(() => {
    if (!range) return null;
    const times = `${shortTime(range.startTime)} – ${shortTime(range.endTime)}`;
    return otherDay ? `${formatShortDate(parisToUtcIso(slotsDate, '12:00'))}, ${times}` : times;
  });
</script>

{#snippet header(room: Room | null, reservation: Reservation | null)}
  <div class="mb-(--space-5) flex flex-wrap items-end justify-between gap-(--space-4)">
    <div>
      <h1>Modifier ma réservation</h1>
      {#if room}
        <p class="mt-(--space-1) text-text-muted">
          {room.name} · {room.location} · {room.capacity} personnes max
        </p>
      {/if}
    </div>
    {#if reservation}
      <StatusBadge status={reservation.status} />
    {/if}
  </div>
{/snippet}

{#snippet backToList()}
  <Button variant="secondary" href="/reservations">Retour à mes réservations</Button>
{/snippet}

{#if page.type === 'loading'}
  {@render header(null, null)}
  <div class="flex flex-col gap-(--space-3)" aria-busy="true">
    <p class="visually-hidden" role="status">Chargement de la réservation…</p>
    <Skeleton class="w-3/5" />
    <Skeleton variant="image" class="rounded-lg" />
  </div>
{:else if page.type === 'not-found'}
  {@render header(null, null)}
  <EmptyState
    title="Réservation introuvable"
    text="Cette réservation n'existe pas ou n'est plus accessible."
    icon="alert"
    headingLevel={2}
    action={backToList}
  />
{:else if page.type === 'error'}
  {@render header(null, null)}
  <ErrorState
    title="La réservation n'a pas pu être chargée"
    message={page.message}
    headingLevel={2}
    onretry={() => void load()}
  />
{:else if page.type === 'locked'}
  {@render header(page.room, page.reservation)}
  <EmptyState
    title="Cette réservation ne peut plus être modifiée."
    text="Seules les réservations en attente ou confirmées, et pas encore commencées, peuvent être modifiées."
    icon="calendar"
    headingLevel={2}
    action={backToList}
  />
{:else}
  {@const { reservation, room } = page}
  {@render header(room, reservation)}

  <div class="grid gap-(--space-5) lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
    <div class="flex flex-col gap-(--space-6)">
      {#if conflict}
        <div bind:this={conflictAlert} tabindex="-1">
          <Alert variant="danger" title="Ce créneau n'est plus disponible">
            <p>
              Une autre réservation a été enregistrée entre-temps. Choisissez un autre horaire, vos
              autres modifications sont conservées.
            </p>
          </Alert>
        </div>
      {/if}

      <section
        class="rounded-lg border border-border bg-surface shadow-sm"
        aria-labelledby="slots-title"
      >
        <div class="flex flex-col gap-(--space-4) p-(--space-4) md:p-(--space-5)">
          <h2 id="slots-title">Nouveau créneau</h2>
          <DatePager
            id="slot-date"
            label="Date"
            bind:value={date}
            min={today}
            onchange={(day) => void loadSlots(room.id, day)}
          />
          {#if slotsStatus === 'error'}
            <ErrorState
              title="Les créneaux n'ont pas pu être chargés"
              message={slotsError}
              onretry={() => void loadSlots(room.id, date)}
            />
          {:else}
            <SlotPicker
              {slots}
              bind:selection
              label={`Créneaux du ${formatDateYmd(slotsStatus === 'ready' ? slotsDate : date)}`}
              {alsoSelectable}
              loading={slotsStatus === 'loading'}
            />
          {/if}
        </div>
      </section>
    </div>

    <aside
      class="rounded-lg border border-border bg-surface shadow-sm lg:sticky lg:top-[calc(4rem+var(--space-4))]"
      aria-labelledby="recap-title"
    >
      <form
        class="flex flex-col gap-(--space-4) p-(--space-4) md:p-(--space-5)"
        novalidate
        onsubmit={submit}
      >
        <h2 id="recap-title">Récapitulatif</h2>
        <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-0 gap-y-(--space-2)">
          <dt class="pr-(--space-4) text-text-muted">Avant</dt>
          <dd class="m-0 text-right font-semibold tabular-nums">{beforeText}</dd>
          <dt class="pr-(--space-4) text-text-muted">Après</dt>
          <dd class="m-0 text-right font-semibold tabular-nums">
            {#if afterText}
              {afterText}
            {:else}
              <span class="font-regular text-text-muted">Aucun créneau choisi</span>
            {/if}
          </dd>
          <dt class="pr-(--space-4) text-text-muted">Durée</dt>
          <dd class="m-0 text-right font-semibold tabular-nums">
            {#if range}
              {range.hours.toLocaleString('fr-FR')} h · {formatPrice(room.pricePerHour)} / heure
            {:else}
              —
            {/if}
          </dd>
        </dl>
        <p class="text-sm text-text-muted">
          Le montant définitif s'affiche dans « Mes réservations ».
        </p>

        {#if selectionError}
          <p class="text-sm font-semibold text-danger-text" role="alert">
            Choisissez un nouveau créneau avant d'enregistrer.
          </p>
        {/if}

        <Field
          label="Nombre de participants"
          id="participants"
          hint={`${room.capacity} personnes maximum`}
          error={participantsError}
        >
          {#snippet children(attrs)}
            <Input
              {...attrs}
              type="number"
              name="numberOfParticipants"
              min="1"
              max={room.capacity}
              required
              inputmode="numeric"
              bind:value={participants}
              onblur={(event: FocusEvent & { currentTarget: HTMLInputElement }) => {
                if (participantsError) {
                  participantsError = fieldValidationMessage(
                    event.currentTarget,
                    participantsRules,
                  );
                }
              }}
            />
          {/snippet}
        </Field>

        <Field label="Commentaire (facultatif)" id="comment">
          {#snippet children(attrs)}
            <Textarea {...attrs} name="comment" rows={3} bind:value={comment} />
          {/snippet}
        </Field>

        {#if submitError}
          <Alert variant="danger" title="Les modifications n'ont pas été enregistrées">
            <p>{submitError}</p>
          </Alert>
        {/if}

        <div class="flex flex-col gap-(--space-2)">
          <Button type="submit" block aria-busy={submitting} aria-disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
          <Button variant="ghost" block href="/reservations">Abandonner</Button>
        </div>
      </form>
    </aside>
  </div>
{/if}
