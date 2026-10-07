<!--
  Grille de créneaux d'une journée (maquette : `.slot-picker`, `.slot-grid`, `.slot`, `.slot-legend` ;
  écrans 02 Fiche salle, 07 Modifier une réservation, 10 Disponibilités « Vue client »).

  Contrat partagé (brief vague 2, n° 1) :
    slots: AvailabilitySlot[]      créneaux de la journée (`getRoomAvailability`), triés
    selection: SlotSelection       plage choisie (`bind:selection`), voir `utils/slotSelection`
    label: string                  ex. « Créneaux du lundi 16 novembre 2026 » (nomme la grille)
    alsoSelectable?: (slot, index) => boolean
                                   rend sélectionnable un créneau indisponible (écran 07)
    inert?: boolean                affichage seul (écran 10) : grille inerte, sans statut ni légende,
                                   libellé réservé aux lecteurs d'écran (la carte a son propre titre)
    loading?: boolean              squelette pendant le chargement

  Sélection : un premier clic choisit le début, un second la fin (règles de `selectSlot`). Un créneau
  indisponible est barré, à bordure pointillée, marqué « Réservé » et `aria-disabled` : son état ne
  repose pas que sur la couleur. Le statut (`role="status"`) annonce la plage choisie.
  Le comportement au clavier avancé (flèches) est prévu en séance 6 : ici, Tab + Entrée/Espace.
-->
<script lang="ts">
  import type { AvailabilitySlot } from '@room-booking/core';
  import { shortTime } from '../utils/dates';
  import {
    EMPTY_SELECTION,
    isSelectable,
    isSelected,
    selectSlot,
    selectionRange,
    type SlotSelection,
  } from '../utils/slotSelection';
  import Skeleton from './Skeleton.svelte';

  interface Props {
    slots: AvailabilitySlot[];
    selection: SlotSelection;
    label: string;
    alsoSelectable?: (slot: AvailabilitySlot, index: number) => boolean;
    inert?: boolean;
    loading?: boolean;
  }

  let {
    slots,
    selection = $bindable(EMPTY_SELECTION),
    label,
    alsoSelectable,
    inert = false,
    loading = false,
  }: Props = $props();

  const uid = $props.id();
  const labelId = `${uid}-label`;

  /** Nombre de créneaux affichés par le squelette (une journée type de 08:00 à 19:00). */
  const SKELETON_COUNT = 11;

  const options = $derived({ alsoSelectable });
  const range = $derived(selectionRange(selection, slots));

  const hoursFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

  const statusText = $derived.by(() => {
    if (loading) return 'Chargement des créneaux…';
    if (slots.length === 0) return '';
    if (!range)
      return "Aucun créneau sélectionné. Choisissez l'heure de début, puis l'heure de fin.";
    const hours = `${hoursFormat.format(range.hours)} ${range.hours >= 2 ? 'heures' : 'heure'}`;
    return `Sélection : de ${shortTime(range.startTime)} à ${shortTime(range.endTime)} (${hours})`;
  });

  function choose(index: number) {
    if (inert) return;
    selection = selectSlot(selection, index, slots, options);
  }
</script>

<div class="flex flex-col gap-(--space-4)">
  <div class="flex flex-col gap-(--space-2)">
    <p id={labelId} class={inert ? 'visually-hidden' : 'font-semibold'}>{label}</p>

    {#if loading}
      <div
        class="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-(--space-2)"
        aria-busy="true"
      >
        {#each { length: SKELETON_COUNT }, index (index)}
          <Skeleton class="h-(--size-control)! rounded-md!" />
        {/each}
      </div>
    {:else if slots.length === 0}
      <p
        class="rounded-md border border-dashed border-border-strong bg-surface px-(--space-4) py-(--space-5) text-center text-text-muted"
      >
        Aucun créneau ce jour.
      </p>
    {:else}
      <div
        class="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-(--space-2)"
        role="group"
        aria-labelledby={labelId}
        {inert}
      >
        {#each slots as slot, index (`${slot.startTime}-${slot.endTime}`)}
          {@const selectable = isSelectable(index, slots, options)}
          {@const pressed = selectable && isSelected(selection, index)}
          <button
            type="button"
            class={[
              'flex min-h-(--size-control) flex-col items-center justify-center rounded-md border',
              'px-(--space-2) py-(--space-1) font-semibold tabular-nums',
              !selectable &&
                'cursor-not-allowed border-dashed border-border bg-surface-muted text-text-muted line-through',
              selectable && pressed && 'cursor-pointer border-action bg-action text-on-action',
              selectable &&
                !pressed &&
                'cursor-pointer border-border-strong bg-surface text-text hover:border-action hover:bg-action-subtle',
            ]}
            aria-pressed={selectable ? pressed : undefined}
            aria-disabled={selectable ? undefined : 'true'}
            onclick={() => {
              choose(index);
            }}
          >
            {shortTime(slot.startTime)}
            <small class={['text-xs font-regular', pressed ? 'text-on-action' : 'text-text-muted']}>
              {selectable ? `à ${shortTime(slot.endTime)}` : 'Réservé'}
            </small>
          </button>
        {/each}
      </div>
    {/if}

    {#if !inert}
      <p role="status" class="text-sm"><strong>{statusText}</strong></p>
    {/if}
  </div>

  {#if !inert}
    <ul
      class="flex flex-wrap gap-x-(--space-4) gap-y-(--space-2) text-sm text-text-muted"
      aria-hidden="true"
    >
      <li class="inline-flex items-center gap-(--space-2)">
        <span class="size-4 rounded-sm border border-border-strong bg-surface"></span>Libre
      </li>
      <li class="inline-flex items-center gap-(--space-2)">
        <span class="size-4 rounded-sm border border-action bg-action"></span>Sélectionné
      </li>
      <li class="inline-flex items-center gap-(--space-2)">
        <span class="size-4 rounded-sm border border-dashed border-border-strong bg-surface-muted"
        ></span>Indisponible
      </li>
    </ul>
  {/if}
</div>
