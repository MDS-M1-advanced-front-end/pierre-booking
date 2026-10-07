<!--
  Écran 10 « Disponibilités » (maquette : ecrans/10-disponibilites.html ; cadrage.md § 4 « 10 »).
  Édition des créneaux d'une salle pour une journée, et aperçu « Vue client » en direct.

  - Données : `getRoom(roomId)` (sous-titre, contrôle du propriétaire), `getRoomAvailability` pour
    la journée choisie, regroupée en plages éditables (`groupSlots`).
  - Une salle d'un autre gestionnaire renvoie vers « Accès refusé » (l'administrateur passe).
  - Journée : `?date=YYYY-MM-DD` (sinon aujourd'hui, heure de Paris), tenue à jour dans l'adresse.
  - Envoi : les plages sont découpées en créneaux d'une heure (`splitIntoHourlySlots`) ; une erreur
    est affichée sur la ligne fautive, qui prend le focus, puis revérifiée à chaque saisie. Le `PUT`
    remplace tous les créneaux de la journée (`setRoomAvailability` : `roomId` absent du contrat,
    anomalie 3, contourné dans `core`).
  - Créneaux sans fuseau : heures de Paris (anomalie 11).

  Props :
    roomId: string   identifiant de la salle
    user: User       utilisateur connecté (fourni par `RequireAuth`)
-->
<script lang="ts">
  import type { Room, User } from '@room-booking/core';
  import { onMount, tick } from 'svelte';
  import Alert from '../../components/Alert.svelte';
  import Button from '../../components/Button.svelte';
  import Checkbox from '../../components/Checkbox.svelte';
  import DatePager from '../../components/DatePager.svelte';
  import ErrorState from '../../components/ErrorState.svelte';
  import Field from '../../components/Field.svelte';
  import Icon from '../../components/Icon.svelte';
  import Input from '../../components/Input.svelte';
  import Skeleton from '../../components/Skeleton.svelte';
  import SlotPicker from '../../components/SlotPicker.svelte';
  import { errorMessage } from '../../data/errors';
  import {
    getRoom,
    getRoomAvailability,
    setRoomAvailability,
  } from '../../data/rooms/rooms.queries';
  import { isIsoDate } from '../../utils/dateNavigation';
  import {
    formatDateYmd,
    minutesToTime,
    shortTime,
    timeToMinutes,
    todayInParis,
  } from '../../utils/dates';
  import { FORBIDDEN_PATH } from '../../utils/redirect';
  import { EMPTY_SELECTION, type SlotSelection } from '../../utils/slotSelection';
  import { splitIntoHourlySlots } from '../../utils/splitIntoHourlySlots';
  import { groupSlots } from './groupSlots';

  interface Props {
    roomId: string;
    user: User;
  }

  let { roomId, user }: Props = $props();

  /** Une ligne de la liste éditable ; `key` identifie la ligne (ids des champs, `#each`). */
  interface Row {
    key: number;
    start: string;
    end: string;
    available: boolean;
  }

  type RoomState =
    | { type: 'loading' }
    | { type: 'error'; status: number; message: string }
    | { type: 'ready'; room: Room };

  type SlotsState = { type: 'loading' } | { type: 'error'; message: string } | { type: 'ready' };

  let roomState = $state<RoomState>({ type: 'loading' });
  let slotsState = $state<SlotsState>({ type: 'loading' });
  let date = $state(todayInParis());
  let rows = $state<Row[]>([]);
  let nextKey = 0;

  /** Erreurs de saisie affichées après une première tentative d'enregistrement. */
  let showErrors = $state(false);
  let saving = $state(false);
  let success = $state<string | null>(null);
  let saveError = $state<string | null>(null);
  /** Aperçu inerte : la sélection n'est jamais modifiée. */
  let previewSelection = $state<SlotSelection>(EMPTY_SELECTION);
  /** Numéro du dernier chargement de créneaux : une réponse plus ancienne est ignorée. */
  let loadId = 0;

  const dateLabel = $derived(isIsoDate(date) ? formatDateYmd(date) : date);
  const split = $derived(splitIntoHourlySlots(rows));
  const rowError = $derived(
    showErrors && !split.ok
      ? { key: rows[split.error.index]?.key, message: split.error.message }
      : null,
  );

  const makeRow = (start: string, end: string, available: boolean): Row => ({
    key: nextKey++,
    start,
    end,
    available,
  });

  async function loadRoom() {
    roomState = { type: 'loading' };
    const result = await getRoom(roomId);
    if (!result.ok) {
      roomState = {
        type: 'error',
        status: result.error.status,
        message: errorMessage(result.error, {
          404: "Cette salle n'existe pas ou a été supprimée.",
        }),
      };
      return;
    }
    // Confort d'interface : l'API refuserait de toute façon l'enregistrement (403).
    if (user.role !== 'ADMINISTRATEUR' && result.data.ownerId !== user.id) {
      location.replace(FORBIDDEN_PATH);
      return;
    }
    roomState = { type: 'ready', room: result.data };
  }

  async function loadSlots() {
    const id = ++loadId;
    slotsState = { type: 'loading' };
    showErrors = false;
    const result = await getRoomAvailability(roomId, { date });
    if (id !== loadId) return;
    if (result.ok) {
      rows = groupSlots(result.data).map((range) =>
        makeRow(range.start, range.end, range.available),
      );
      slotsState = { type: 'ready' };
    } else {
      slotsState = { type: 'error', message: errorMessage(result.error) };
    }
  }

  onMount(() => {
    const param = new URL(location.href).searchParams.get('date');
    if (param && isIsoDate(param)) date = param;
    void loadRoom();
    void loadSlots();
  });

  function changeDate(value: string) {
    success = null;
    saveError = null;
    const url = new URL(location.href);
    url.searchParams.set('date', value);
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    void loadSlots();
  }

  /** Nouvelle plage d'une heure, à la suite de la dernière (08:00 par défaut). */
  async function addRow() {
    const last = rows.at(-1);
    let start = 8 * 60;
    try {
      if (last) start = Math.min(timeToMinutes(last.end), 22 * 60);
    } catch {
      // Fin de la dernière ligne vide ou invalide : on garde 08:00.
    }
    const row = makeRow(
      shortTime(minutesToTime(start)),
      shortTime(minutesToTime(start + 60)),
      true,
    );
    rows.push(row);
    await tick();
    document.getElementById(`start-${row.key}`)?.focus();
  }

  async function removeRow(index: number) {
    rows.splice(index, 1);
    await tick();
    // Le focus passe à la ligne suivante (ou précédente), sinon au bouton d'ajout.
    const next = rows[index] ?? rows[index - 1];
    const target = document.getElementById(next ? `start-${next.key}` : 'add-slot');
    target?.focus();
  }

  function rangeLabel(row: Row): string {
    return row.start && row.end ? `de ${row.start} à ${row.end}` : `n° ${rows.indexOf(row) + 1}`;
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (saving || slotsState.type !== 'ready') return;
    success = null;
    saveError = null;
    if (!split.ok) {
      showErrors = true;
      const key = rows[split.error.index]?.key;
      await tick();
      document.getElementById(`start-${key}`)?.focus();
      return;
    }
    showErrors = false;
    saving = true;
    const savedDate = date;
    const result = await setRoomAvailability(roomId, { date: savedDate, slots: split.data });
    saving = false;
    if (result.ok) {
      success = `Les créneaux du ${formatDateYmd(savedDate)} ont été enregistrés.`;
    } else {
      saveError = errorMessage(result.error, {
        403: "Vous n'avez pas les droits pour modifier cette salle.",
        404: "Cette salle n'existe pas ou a été supprimée.",
      });
    }
  }

  const cardClasses = 'rounded-lg border border-border bg-surface shadow-sm';
  const cardBodyClasses = 'flex flex-col gap-(--space-4) p-(--space-4) md:p-(--space-5)';
</script>

{#if roomState.type === 'error'}
  <div class="mt-(--space-5)">
    <ErrorState
      title={roomState.status === 404 ? 'Salle introuvable' : "La salle n'a pas pu être chargée"}
      message={roomState.message}
      headingLevel={2}
      onretry={roomState.status === 404 ? undefined : loadRoom}
    />
  </div>
{:else}
  <div class="mt-(--space-1) mb-(--space-5)">
    {#if roomState.type === 'ready'}
      <p class="text-text-muted">{roomState.room.name} · {roomState.room.location}</p>
    {:else}
      <Skeleton class="mt-(--space-2) w-1/4" />
    {/if}
  </div>

  <div class="grid gap-(--space-5) lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
    <form class={cardClasses} novalidate onsubmit={save}>
      <div class={cardBodyClasses}>
        {#if success}
          <Alert variant="success"><p>{success}</p></Alert>
        {/if}
        {#if saveError}
          <Alert variant="danger"><p>{saveError}</p></Alert>
        {/if}

        <DatePager id="av-date" label="Journée" bind:value={date} onchange={changeDate} />

        <Alert variant="info">
          <p>L'enregistrement remplace tous les créneaux de cette journée.</p>
        </Alert>

        {#if slotsState.type === 'error'}
          <ErrorState
            title="Les créneaux n'ont pas pu être chargés"
            message={slotsState.message}
            onretry={loadSlots}
          />
        {:else}
          <fieldset class="m-0 border-0 p-0" aria-busy={slotsState.type === 'loading'}>
            <legend class="mb-(--space-2) p-0 font-semibold">Créneaux du {dateLabel}</legend>
            {#if slotsState.type === 'loading'}
              <p class="visually-hidden" role="status">Chargement des créneaux…</p>
              <div class="flex flex-col gap-(--space-2)">
                <Skeleton class="h-(--size-control)! rounded-md!" />
                <Skeleton class="h-(--size-control)! rounded-md!" />
                <Skeleton class="h-(--size-control)! rounded-md!" />
              </div>
            {:else if rows.length === 0}
              <p class="text-text-muted">
                Aucun créneau pour cette journée. Ajoutez-en un pour rendre la salle réservable.
              </p>
            {:else}
              <ul class="m-0 flex list-none flex-col gap-(--space-2) p-0">
                {#each rows as row, index (row.key)}
                  {@const invalid = rowError?.key === row.key}
                  {@const errorId = `row-${row.key}-error`}
                  <li
                    class={[
                      'grid grid-cols-2 items-end gap-x-(--space-3) gap-y-(--space-2) rounded-md border p-(--space-3)',
                      'md:grid-cols-[1fr_1fr_auto] md:border-0 md:p-0',
                      invalid ? 'border-danger' : 'border-border',
                    ]}
                  >
                    <Field label="Début" id={`start-${row.key}`} class="[&>label]:text-sm">
                      {#snippet children(attrs)}
                        <Input
                          {...attrs}
                          type="time"
                          step="3600"
                          required
                          bind:value={row.start}
                          aria-invalid={invalid ? 'true' : undefined}
                          aria-describedby={invalid ? errorId : undefined}
                        />
                      {/snippet}
                    </Field>
                    <Field label="Fin" id={`end-${row.key}`} class="[&>label]:text-sm">
                      {#snippet children(attrs)}
                        <Input
                          {...attrs}
                          type="time"
                          step="3600"
                          required
                          bind:value={row.end}
                          aria-invalid={invalid ? 'true' : undefined}
                          aria-describedby={invalid ? errorId : undefined}
                        />
                      {/snippet}
                    </Field>
                    <div
                      class="col-span-full flex items-center justify-between gap-(--space-3) md:col-auto md:min-h-(--size-control)"
                    >
                      <Checkbox bind:checked={row.available}>Réservable</Checkbox>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onclick={() => {
                          void removeRow(index);
                        }}
                      >
                        <Icon name="trash" />
                        <span class="visually-hidden">Supprimer le créneau {rangeLabel(row)}</span>
                      </Button>
                    </div>
                    {#if invalid && rowError}
                      <p
                        id={errorId}
                        class="col-span-full flex items-start gap-(--space-1) text-sm font-semibold text-danger-text"
                      >
                        <Icon name="alert" class="mt-[0.1em]" />
                        {rowError.message}
                      </p>
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          </fieldset>

          <Button
            variant="ghost"
            class="self-start"
            id="add-slot"
            aria-disabled={slotsState.type === 'loading'}
            onclick={() => {
              if (slotsState.type === 'ready') void addRow();
            }}
          >
            <Icon name="plus" />
            Ajouter un créneau
          </Button>
        {/if}

        <div
          class="flex flex-wrap-reverse justify-end gap-(--space-3) pt-(--space-2) max-md:*:flex-[1_1_100%]"
        >
          <Button variant="secondary" href="/gestion/salles">Annuler</Button>
          <Button
            type="submit"
            aria-disabled={saving || slotsState.type !== 'ready'}
            aria-busy={saving}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer la journée'}
          </Button>
        </div>
      </div>
    </form>

    <aside class="lg:sticky lg:top-[calc(4rem+var(--space-4))]" aria-labelledby="client-view-title">
      <div class={cardClasses}>
        <div class={cardBodyClasses}>
          <h2 id="client-view-title">Vue client</h2>
          <p class="text-sm text-text-muted">
            Les créneaux tels qu'ils apparaissent sur la fiche de la salle.
          </p>
          {#if slotsState.type === 'ready' && !split.ok}
            <p class="text-sm text-text-muted">
              L'aperçu sera mis à jour quand les créneaux saisis seront valides.
            </p>
          {:else}
            <SlotPicker
              slots={split.ok ? split.data : []}
              bind:selection={previewSelection}
              label={`Aperçu des créneaux du ${dateLabel}`}
              inert
              loading={slotsState.type === 'loading'}
            />
          {/if}
        </div>
      </div>
    </aside>
  </div>
{/if}
