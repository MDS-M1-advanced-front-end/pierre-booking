import type { AvailabilitySlot } from '@room-booking/core';
import { describe, expect, it } from 'vitest';
import { splitIntoHourlySlots } from '../../utils/splitIntoHourlySlots';
import { groupSlots } from './groupSlots';

const slot = (startTime: string, endTime: string, available: boolean): AvailabilitySlot => ({
  startTime,
  endTime,
  available,
});

// Journée du mock pour la Salle Voltaire (maquette de l'écran 10).
const mockDay: AvailabilitySlot[] = [
  slot('08:00:00', '09:00:00', true),
  slot('09:00:00', '10:00:00', false),
  slot('10:00:00', '11:00:00', false),
  slot('11:00:00', '12:00:00', false),
  slot('12:00:00', '13:00:00', true),
  slot('13:00:00', '14:00:00', true),
  slot('14:00:00', '15:00:00', false),
  slot('15:00:00', '16:00:00', true),
  slot('16:00:00', '17:00:00', true),
  slot('17:00:00', '18:00:00', true),
  slot('18:00:00', '19:00:00', true),
];

describe('groupSlots', () => {
  it('regroupe les créneaux consécutifs de même disponibilité', () => {
    expect(groupSlots(mockDay)).toEqual([
      { start: '08:00', end: '09:00', available: true },
      { start: '09:00', end: '12:00', available: false },
      { start: '12:00', end: '14:00', available: true },
      { start: '14:00', end: '15:00', available: false },
      { start: '15:00', end: '19:00', available: true },
    ]);
  });

  it('renvoie une liste vide pour une journée sans créneau', () => {
    expect(groupSlots([])).toEqual([]);
  });

  it('ouvre une nouvelle plage après un trou horaire', () => {
    expect(groupSlots([slot('08:00', '09:00', true), slot('10:00', '11:00', true)])).toEqual([
      { start: '08:00', end: '09:00', available: true },
      { start: '10:00', end: '11:00', available: true },
    ]);
  });

  it('trie les créneaux reçus dans le désordre', () => {
    expect(
      groupSlots([
        slot('10:00:00', '11:00:00', true),
        slot('08:00:00', '09:00:00', true),
        slot('09:00:00', '10:00:00', true),
      ]),
    ).toEqual([{ start: '08:00', end: '11:00', available: true }]);
  });

  it('ignore un créneau illisible ou vide', () => {
    expect(
      groupSlots([
        slot('8h', '9h', true),
        slot('09:00', '09:00', true),
        slot('09:00', '10:00', false),
      ]),
    ).toEqual([{ start: '09:00', end: '10:00', available: false }]);
  });

  it('est l’inverse du découpage horaire', () => {
    const split = splitIntoHourlySlots(groupSlots(mockDay));
    expect(split).toEqual({ ok: true, data: mockDay });
  });
});
