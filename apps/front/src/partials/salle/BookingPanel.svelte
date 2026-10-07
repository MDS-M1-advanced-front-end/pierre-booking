<!--
  Îlot de réservation de la fiche salle (écran 02), en `client:load` : il s'affiche pour tous, la
  partie qui dépend de la session (bouton ou lien de connexion) se règle dans le navigateur.

  Il porte toute la mise en page `.layout-aside` de la maquette, parce que la sélection des
  créneaux (colonne principale) et le récapitulatif (panneau latéral) partagent leur état :
    - colonne principale : le contenu rendu par le serveur (`children` : photo, nom, équipements),
      puis la carte « Choisir un créneau » (`DatePager` + `SlotPicker`) ;
    - panneau « Votre réservation », collant en desktop : récapitulatif, participants, commentaire,
      bouton « Demander la réservation » (ou lien « Se connecter pour réserver »).

  Pas d'estimation de prix (cadrage § 2.7, anomalie 1) : on affiche la durée et le tarif horaire.
  Dates : `date` est un jour de Paris ; `startAt` / `endAt` partent en UTC (`parisToUtcIso`).
-->
<script lang="ts">
  import type { AvailabilitySlot, Room, User } from '@room-booking/core';
  import { onMount, untrack, type Snippet } from 'svelte';
  import Alert from '../../components/Alert.svelte';
  import Button from '../../components/Button.svelte';
  import DatePager from '../../components/DatePager.svelte';
  import ErrorState from '../../components/ErrorState.svelte';
  import Field from '../../components/Field.svelte';
  import Input from '../../components/Input.svelte';
  import SlotPicker from '../../components/SlotPicker.svelte';
  import Textarea from '../../components/Textarea.svelte';
  import { restoreSession } from '../../data/auth/session.svelte';
  import { errorMessage } from '../../data/errors';
  import { createReservation } from '../../data/reservations/reservations.queries';
  import { getRoomAvailability } from '../../data/rooms/rooms.queries';
  import { isBefore, isIsoDate } from '../../utils/dateNavigation';
  import {
    formatDateYmd,
    formatShortDate,
    parisToUtcIso,
    shortTime,
    todayInParis,
  } from '../../utils/dates';
  import { formatPrice } from '../../utils/formatPrice';
  import { buildLoginUrl } from '../../utils/redirect';
  import { EMPTY_SELECTION, selectionRange, type SlotSelection } from '../../utils/slotSelection';
  import { fieldValidationMessage } from '../../utils/validationMessage';

  interface Props {
    room: Room;
    /** Valeur brute du paramètre d'URL `?date=` (jour à afficher), s'il y en a un. */
    dateParam?: string | null;
    /** Contenu de la colonne principale rendu par le serveur (photo, nom, équipements). */
    children?: Snippet;
  }

  let { room, dateParam = null, children }: Props = $props();

  /** Jour demandé s'il est valide et pas dans le passé, sinon aujourd'hui (heure de Paris). */
  const initialDate = (param: string | null, today: string) =>
    param !== null && isIsoDate(param) && !isBefore(param, today) ? param : today;

  // Recalculés au montage : une page servie depuis le cache peut dater de la veille.
  let today = $state(todayInParis());
  // Valeur de départ seulement : ensuite, `date` suit le sélecteur.
  let date = $state(
    initialDate(
      untrack(() => dateParam),
      todayInParis(),
    ),
  );

  let rawSlots = $state<AvailabilitySlot[]>([]);
  let loading = $state(true);
  let loadError = $state<string | null>(null);
  let selection = $state<SlotSelection>(EMPTY_SELECTION);

  let user = $state<User | null>(null);
  let participants = $state<number | null>(null);
  let comment = $state('');
  let participantsError = $state<string | null>(null);
  let submitting = $state(false);
  let submitError = $state<string | null>(null);
  let conflict = $state(false);

  const isActive = $derived(room.status === 'ACTIVE');

  // Aujourd'hui, un créneau déjà commencé ne se réserve plus : on le montre indisponible.
  const slots = $derived.by(() => {
    if (date !== today) return rawSlots;
    const now = Date.now();
    return rawSlots.map((slot) =>
      slot.available && Date.parse(parisToUtcIso(date, slot.startTime)) <= now
        ? { ...slot, available: false }
        : slot,
    );
  });

  const range = $derived(selectionRange(selection, slots));
  const loginHref = $derived(buildLoginUrl(`/salles/${room.id}?date=${date}`));

  const hoursFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
  const capacityHint = $derived(
    `${room.capacity} ${room.capacity >= 2 ? 'personnes' : 'personne'} maximum`,
  );
  const participantsRules = {
    subject: 'Le nombre de participants',
    unit: ['personne', 'personnes'],
  } as const;

  let requestId = 0;

  /** Charge les créneaux du jour ; la sélection est réinitialisée à chaque changement de date. */
  async function loadSlots(day: string) {
    const current = ++requestId;
    selection = EMPTY_SELECTION;
    conflict = false;
    loading = true;
    loadError = null;
    const result = await getRoomAvailability(room.id, { date: day });
    // Une réponse arrivée après un autre changement de date est ignorée.
    if (current !== requestId) return;
    loading = false;
    if (result.ok) {
      rawSlots = [...result.data].sort((a, b) => a.startTime.localeCompare(b.startTime));
    } else {
      rawSlots = [];
      loadError = errorMessage(result.error);
    }
  }

  function changeDate(day: string) {
    // L'URL suit le jour affiché : lien partageable et retour après connexion.
    const url = new URL(location.href);
    url.searchParams.set('date', day);
    history.replaceState(history.state, '', url);
    void loadSlots(day);
  }

  onMount(() => {
    user = restoreSession();
    today = todayInParis();
    date = initialDate(new URL(location.href).searchParams.get('date'), today);
    void loadSlots(date);
  });

  async function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (!range || submitting || !isActive) return;

    const input = event.currentTarget.elements.namedItem('participants');
    if (!(input instanceof HTMLInputElement)) return;
    participantsError = fieldValidationMessage(input, participantsRules);
    if (participantsError) {
      input.focus();
      return;
    }

    submitting = true;
    submitError = null;
    conflict = false;
    const trimmedComment = comment.trim();
    const result = await createReservation({
      roomId: room.id,
      startAt: parisToUtcIso(date, range.startTime),
      endAt: parisToUtcIso(date, range.endTime),
      numberOfParticipants: Number(input.value),
      ...(trimmedComment !== '' && { comment: trimmedComment }),
    });

    if (result.ok) {
      location.assign('/reservations?created=1');
      return;
    }
    submitting = false;
    // 409 : le créneau a été pris entre-temps ; la saisie est conservée.
    if (result.error.status === 409) conflict = true;
    else submitError = errorMessage(result.error);
  }
</script>

<div class="grid gap-(--space-5) lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
  <div class="flex flex-col gap-(--space-6)">
    {@render children?.()}

    <section
      class="rounded-lg border border-border bg-surface shadow-sm"
      aria-labelledby="slots-title"
    >
      <div class="p-(--space-4) md:p-(--space-5)">
        <h2 id="slots-title" class="mb-(--space-4)">Choisir un créneau</h2>
        <div class="flex flex-col gap-(--space-4)">
          <DatePager
            id="slot-date"
            label="Date"
            bind:value={date}
            min={today}
            onchange={changeDate}
          />
          {#if loadError}
            <ErrorState
              title="Les créneaux n'ont pas pu être chargés"
              message={loadError}
              onretry={() => {
                void loadSlots(date);
              }}
            />
          {:else}
            <SlotPicker
              {slots}
              bind:selection
              label={`Créneaux du ${formatDateYmd(date)}`}
              {loading}
            />
          {/if}
        </div>
      </div>
    </section>
  </div>

  <aside
    class="rounded-lg border border-border bg-surface shadow-sm lg:sticky lg:top-[calc(4rem+var(--space-4))]"
    aria-labelledby="booking-title"
  >
    <form
      class="flex flex-col gap-(--space-4) p-(--space-4) md:p-(--space-5)"
      novalidate
      onsubmit={handleSubmit}
    >
      <h2 id="booking-title">Votre réservation</h2>

      {#if conflict}
        <Alert variant="danger" title="Ce créneau n'est plus disponible">
          <p>
            Une autre réservation a été enregistrée entre-temps. Choisissez un autre horaire, vos
            autres informations sont conservées.
          </p>
        </Alert>
      {:else if submitError}
        <Alert variant="danger" title="La demande n'a pas pu être envoyée">
          <p>{submitError}</p>
        </Alert>
      {/if}

      <dl class="m-0 grid grid-cols-[auto_1fr] gap-y-(--space-2)">
        <dt class="pr-(--space-4) text-text-muted">Date</dt>
        <dd class="m-0 text-right font-semibold tabular-nums">
          {formatShortDate(parisToUtcIso(date, '12:00'))}
        </dd>
        <dt class="pr-(--space-4) text-text-muted">Horaire</dt>
        <dd class="m-0 text-right font-semibold tabular-nums">
          {#if range}
            {shortTime(range.startTime)} – {shortTime(range.endTime)}
          {:else}
            <span class="font-regular text-text-muted">À choisir</span>
          {/if}
        </dd>
        <dt class="pr-(--space-4) text-text-muted">Durée</dt>
        <dd class="m-0 text-right font-semibold tabular-nums">
          {#if range}
            {hoursFormat.format(range.hours)} h · {formatPrice(room.pricePerHour)} / heure
          {:else}
            <span class="font-regular text-text-muted"
              >{formatPrice(room.pricePerHour)} / heure</span
            >
          {/if}
        </dd>
      </dl>

      <Field label="Nombre de participants" required hint={capacityHint} error={participantsError}>
        {#snippet children(attrs)}
          <Input
            {...attrs}
            name="participants"
            type="number"
            inputmode="numeric"
            min="1"
            max={room.capacity}
            step="1"
            required
            bind:value={participants}
            onblur={(event) => {
              if (participantsError) {
                participantsError = fieldValidationMessage(event.currentTarget, participantsRules);
              }
            }}
          />
        {/snippet}
      </Field>

      <Field label="Commentaire (facultatif)">
        {#snippet children(attrs)}
          <Textarea {...attrs} name="comment" rows={3} bind:value={comment} />
        {/snippet}
      </Field>

      {#if !isActive}
        <Alert variant="info">
          <p>Cette salle n'accepte pas de réservation pour le moment.</p>
        </Alert>
      {:else if user}
        <div class="flex flex-col gap-(--space-2)">
          <Button
            type="submit"
            block
            aria-disabled={!range || submitting}
            aria-busy={submitting}
            aria-describedby={range ? undefined : 'booking-requirement'}
          >
            Demander la réservation
          </Button>
          {#if !range}
            <p id="booking-requirement" class="text-sm text-text-muted">
              Choisissez au moins un créneau pour envoyer votre demande.
            </p>
          {/if}
        </div>
      {:else}
        <Button href={loginHref} block>Se connecter pour réserver</Button>
      {/if}

      <p class="text-sm text-text-muted">
        Votre demande est transmise au gestionnaire de la salle. Le montant définitif s'affiche dans
        «&nbsp;Mes réservations&nbsp;».
      </p>
    </form>
  </aside>
</div>
