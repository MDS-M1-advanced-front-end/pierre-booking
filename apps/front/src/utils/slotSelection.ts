/**
 * Sélection d'une plage de créneaux d'une heure (SlotPicker, écrans 02 et 07), en fonctions pures.
 *
 * Hypothèses :
 * - `slots` est la liste renvoyée par `getRoomAvailability` pour une journée : créneaux d'une heure,
 *   triés, heures de Paris au format `HH:MM:SS` (mock) ou `HH:MM`.
 * - La sélection est un intervalle d'indices `[start, end]` dans cette liste ; `end === null` veut
 *   dire « début choisi, fin pas encore choisie » (la sélection vaut alors un seul créneau).
 *
 * Règles d'un clic sur le créneau `index` (« un premier clic choisit le début, un second la fin ») :
 * 1. créneau non sélectionnable (indisponible, ou indice hors liste) : clic ignoré ;
 * 2. rien de sélectionné : ce créneau devient le début ;
 * 3. début seul choisi :
 *    - clic sur le début : on désélectionne tout ;
 *    - clic avant le début : ce créneau devient le nouveau début ;
 *    - clic après le début : il devient la fin si tous les créneaux entre les deux sont
 *      sélectionnables et se suivent sans trou horaire ; sinon il devient le nouveau début ;
 * 4. plage complète (début et fin choisis, éventuellement égaux) : tout clic recommence une sélection d'un seul créneau
 *    à cet endroit, qu'il soit dans la plage ou non.
 *
 * Écran 07 (décision 9) : les créneaux de la réservation en cours de modification peuvent revenir
 * « indisponibles » ; l'option `alsoSelectable` les rend sélectionnables (voir `withinTimes`).
 */
import type { AvailabilitySlot } from '@room-booking/core';
import { timeToMinutes } from './dates';

export interface SlotSelection {
  start: number | null;
  end: number | null;
}

export interface SlotSelectionOptions {
  /** Rend sélectionnable un créneau indisponible (créneaux de la réservation modifiée). */
  alsoSelectable?: (slot: AvailabilitySlot, index: number) => boolean;
}

export const EMPTY_SELECTION: SlotSelection = { start: null, end: null };

const isIndexOf = (index: number, slots: readonly AvailabilitySlot[]) =>
  Number.isInteger(index) && index >= 0 && index < slots.length;

/** Un créneau peut-il être choisi ? */
export const isSelectable = (
  index: number,
  slots: readonly AvailabilitySlot[],
  options: SlotSelectionOptions = {},
): boolean => {
  if (!isIndexOf(index, slots)) return false;
  const slot = slots[index];
  return slot.available || (options.alsoSelectable?.(slot, index) ?? false);
};

/** Tous les créneaux de `from` à `to` (inclus) sont-ils sélectionnables et sans trou horaire ? */
const isContiguous = (
  from: number,
  to: number,
  slots: readonly AvailabilitySlot[],
  options: SlotSelectionOptions,
): boolean => {
  for (let i = from; i <= to; i++) {
    if (!isSelectable(i, slots, options)) return false;
    if (i > from && timeToMinutes(slots[i - 1].endTime) !== timeToMinutes(slots[i].startTime)) {
      return false;
    }
  }
  return true;
};

/** Nouvel état après un clic sur le créneau `index` (règles en tête de fichier). */
export const selectSlot = (
  state: SlotSelection,
  index: number,
  slots: readonly AvailabilitySlot[],
  options: SlotSelectionOptions = {},
): SlotSelection => {
  if (!isSelectable(index, slots, options)) return state;
  const { start, end } = state;
  if (start === null || end !== null) return { start: index, end: null };
  if (index === start) return EMPTY_SELECTION;
  if (index > start && isContiguous(start, index, slots, options)) return { start, end: index };
  return { start: index, end: null };
};

/** Le créneau `index` fait-il partie de la sélection ? */
export const isSelected = (state: SlotSelection, index: number): boolean =>
  state.start !== null && index >= state.start && index <= (state.end ?? state.start);

/** Heures de la sélection (format des créneaux) et durée en heures, ou `null` si rien n'est choisi. */
export const selectionRange = (
  state: SlotSelection,
  slots: readonly AvailabilitySlot[],
): { startTime: string; endTime: string; hours: number } | null => {
  if (state.start === null) return null;
  const lastIndex = state.end ?? state.start;
  if (!isIndexOf(state.start, slots) || !isIndexOf(lastIndex, slots)) return null;
  const first = slots[state.start];
  const last = slots[lastIndex];
  return {
    startTime: first.startTime,
    endTime: last.endTime,
    hours: (timeToMinutes(last.endTime) - timeToMinutes(first.startTime)) / 60,
  };
};

/**
 * Prédicat « le créneau est compris entre `startTime` et `endTime` » (heures de Paris, `HH:MM` ou
 * `HH:MM:SS`), à passer à `alsoSelectable` pour la plage d'origine d'une réservation modifiée.
 */
export const withinTimes =
  (startTime: string, endTime: string) =>
  (slot: AvailabilitySlot): boolean =>
    timeToMinutes(slot.startTime) >= timeToMinutes(startTime) &&
    timeToMinutes(slot.endTime) <= timeToMinutes(endTime);

/**
 * Sélection complète couvrant exactement `startTime`–`endTime` (présélection de l'écran 07), ou
 * sélection vide si ces heures ne correspondent pas à une suite de créneaux de la liste.
 */
export const selectionForTimes = (
  slots: readonly AvailabilitySlot[],
  startTime: string,
  endTime: string,
): SlotSelection => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const start = slots.findIndex((slot) => timeToMinutes(slot.startTime) === startMinutes);
  const end = slots.findIndex((slot) => timeToMinutes(slot.endTime) === endMinutes);
  if (start === -1 || end === -1 || end < start) return EMPTY_SELECTION;
  const options = { alsoSelectable: withinTimes(startTime, endTime) };
  if (!isContiguous(start, end, slots, options)) return EMPTY_SELECTION;
  return { start, end };
};
