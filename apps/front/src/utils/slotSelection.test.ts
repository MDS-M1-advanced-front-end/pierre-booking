import type { AvailabilitySlot } from '@room-booking/core';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_SELECTION,
  isSelectable,
  isSelected,
  selectSlot,
  selectionForTimes,
  selectionRange,
  withinTimes,
  type SlotSelection,
} from './slotSelection';

// Journée du mock (16 novembre 2026) : 08–19 h, indisponibles 09–12 h et 14–15 h.
//  0 08  1 09✗  2 10✗  3 11✗  4 12  5 13  6 14✗  7 15  8 16  9 17  10 18
const hours: [number, boolean][] = [
  [8, true],
  [9, false],
  [10, false],
  [11, false],
  [12, true],
  [13, true],
  [14, false],
  [15, true],
  [16, true],
  [17, true],
  [18, true],
];
const pad = (hour: number) => `${String(hour).padStart(2, '0')}:00:00`;
const slots: AvailabilitySlot[] = hours.map(([hour, available]) => ({
  startTime: pad(hour),
  endTime: pad(hour + 1),
  available,
}));

/** Enchaîne des clics depuis une sélection vide. */
const clicks = (indexes: number[], list = slots, options = {}): SlotSelection =>
  indexes.reduce((state, index) => selectSlot(state, index, list, options), EMPTY_SELECTION);

describe('selectSlot', () => {
  it('premier clic : choisit le début', () => {
    expect(clicks([7])).toEqual({ start: 7, end: null });
  });

  it('second clic après le début : choisit la fin', () => {
    expect(clicks([7, 9])).toEqual({ start: 7, end: 9 });
    expect(clicks([4, 5])).toEqual({ start: 4, end: 5 });
  });

  it('second clic sur le début : désélectionne', () => {
    expect(clicks([7, 7])).toEqual(EMPTY_SELECTION);
  });

  it('second clic avant le début : nouveau début', () => {
    expect(clicks([8, 7])).toEqual({ start: 7, end: null });
    expect(clicks([7, 0])).toEqual({ start: 0, end: null });
  });

  it('second clic au-delà d’un créneau indisponible : recommence à ce créneau', () => {
    expect(clicks([5, 7])).toEqual({ start: 7, end: null });
    expect(clicks([0, 4])).toEqual({ start: 4, end: null });
  });

  it('ignore un clic sur un créneau indisponible', () => {
    expect(clicks([2])).toEqual(EMPTY_SELECTION);
    expect(clicks([7, 6])).toEqual({ start: 7, end: null });
    expect(clicks([7, 9, 6])).toEqual({ start: 7, end: 9 });
  });

  it('ignore un indice hors de la liste', () => {
    expect(clicks([-1])).toEqual(EMPTY_SELECTION);
    expect(clicks([7, 11])).toEqual({ start: 7, end: null });
  });

  it('renvoie le même objet quand le clic est ignoré', () => {
    const state = { start: 7, end: null };
    expect(selectSlot(state, 6, slots)).toBe(state);
  });

  it('plage complète : un clic dans la plage recommence sur ce seul créneau', () => {
    expect(clicks([7, 10, 8])).toEqual({ start: 8, end: null });
    expect(clicks([7, 10, 7])).toEqual({ start: 7, end: null });
    expect(clicks([7, 10, 10])).toEqual({ start: 10, end: null });
  });

  it('plage complète : un clic hors de la plage recommence aussi', () => {
    expect(clicks([7, 8, 10])).toEqual({ start: 10, end: null });
    expect(clicks([7, 8, 0])).toEqual({ start: 0, end: null });
  });

  it('plage complète puis deux clics : nouvelle plage', () => {
    expect(clicks([7, 8, 4, 5])).toEqual({ start: 4, end: 5 });
  });

  it('refuse une plage qui enjambe un trou horaire', () => {
    const withGap: AvailabilitySlot[] = [
      { startTime: '08:00:00', endTime: '09:00:00', available: true },
      { startTime: '10:00:00', endTime: '11:00:00', available: true },
    ];
    expect(clicks([0, 1], withGap)).toEqual({ start: 1, end: null });
  });

  it('accepte des heures au format HH:MM', () => {
    const short: AvailabilitySlot[] = [
      { startTime: '08:00', endTime: '09:00', available: true },
      { startTime: '09:00', endTime: '10:00', available: true },
    ];
    expect(clicks([0, 1], short)).toEqual({ start: 0, end: 1 });
  });
});

describe('alsoSelectable (réservation modifiée, décision 9)', () => {
  // La réservation modifiée occupe 09:00–12:00, renvoyés indisponibles par l'API.
  const options = { alsoSelectable: withinTimes('09:00', '12:00') };

  it('rend sélectionnables les créneaux de la réservation', () => {
    expect(isSelectable(2, slots, options)).toBe(true);
    expect(isSelectable(2, slots)).toBe(false);
    expect(clicks([2], slots, options)).toEqual({ start: 2, end: null });
  });

  it('permet une plage qui les inclut avec des créneaux libres voisins', () => {
    expect(clicks([0, 5], slots, options)).toEqual({ start: 0, end: 5 });
    expect(clicks([3, 4], slots, options)).toEqual({ start: 3, end: 4 });
  });

  it('laisse indisponibles les autres créneaux pris', () => {
    expect(isSelectable(6, slots, options)).toBe(false);
    expect(clicks([5, 7], slots, options)).toEqual({ start: 7, end: null });
  });

  it('reçoit le créneau et son indice', () => {
    const onlyIndexOne = { alsoSelectable: (_: AvailabilitySlot, index: number) => index === 1 };
    expect(isSelectable(1, slots, onlyIndexOne)).toBe(true);
    expect(isSelectable(2, slots, onlyIndexOne)).toBe(false);
  });
});

describe('isSelected', () => {
  it('rien de sélectionné', () => {
    expect(slots.some((_, index) => isSelected(EMPTY_SELECTION, index))).toBe(false);
  });

  it('début seul : un seul créneau', () => {
    const state = { start: 7, end: null };
    expect(slots.map((_, index) => isSelected(state, index))).toEqual(
      slots.map((_, index) => index === 7),
    );
  });

  it('plage : bornes incluses', () => {
    const state = { start: 7, end: 9 };
    expect([6, 7, 8, 9, 10].map((index) => isSelected(state, index))).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
  });
});

describe('selectionRange', () => {
  it('null si rien n’est sélectionné', () => {
    expect(selectionRange(EMPTY_SELECTION, slots)).toBeNull();
  });

  it('un seul créneau : une heure', () => {
    expect(selectionRange({ start: 7, end: null }, slots)).toEqual({
      startTime: '15:00:00',
      endTime: '16:00:00',
      hours: 1,
    });
  });

  it('plage : début du premier, fin du dernier, durée', () => {
    expect(selectionRange({ start: 7, end: 10 }, slots)).toEqual({
      startTime: '15:00:00',
      endTime: '19:00:00',
      hours: 4,
    });
  });

  it('null si la sélection ne correspond plus à la liste', () => {
    expect(selectionRange({ start: 20, end: null }, slots)).toBeNull();
    expect(selectionRange({ start: 0, end: 3 }, [])).toBeNull();
  });
});

describe('selectionForTimes (présélection de l’écran 07)', () => {
  it('sélectionne la plage d’origine, même indisponible', () => {
    expect(selectionForTimes(slots, '09:00', '12:00')).toEqual({ start: 1, end: 3 });
    expect(selectionForTimes(slots, '15:00:00', '17:00:00')).toEqual({ start: 7, end: 8 });
  });

  it('un seul créneau donne une plage complète (début = fin)', () => {
    const state = selectionForTimes(slots, '12:00', '13:00');
    expect(state).toEqual({ start: 4, end: 4 });
    expect(selectionRange(state, slots)?.hours).toBe(1);
    // Un clic recommence alors une sélection, comme pour toute plage complète.
    expect(selectSlot(state, 5, slots)).toEqual({ start: 5, end: null });
  });

  it('sélection vide si les heures ne tombent pas sur des créneaux', () => {
    expect(selectionForTimes(slots, '07:00', '09:00')).toEqual(EMPTY_SELECTION);
    expect(selectionForTimes(slots, '12:00', '20:00')).toEqual(EMPTY_SELECTION);
    expect(selectionForTimes([], '12:00', '13:00')).toEqual(EMPTY_SELECTION);
  });

  it('les créneaux indisponibles de la plage d’origine sont acceptés (ce sont ceux de la réservation)', () => {
    expect(selectionForTimes(slots, '13:00', '16:00')).toEqual({ start: 5, end: 7 });
  });
});
