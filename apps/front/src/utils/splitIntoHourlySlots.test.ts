import { describe, expect, it } from 'vitest';
import { splitIntoHourlySlots } from './splitIntoHourlySlots';

const slot = (startTime: string, endTime: string, available = true) => ({
  startTime,
  endTime,
  available,
});

describe('splitIntoHourlySlots', () => {
  it('reproduit la journée de la maquette (écran 10)', () => {
    const result = splitIntoHourlySlots([
      { start: '08:00', end: '09:00', available: true },
      { start: '09:00', end: '12:00', available: false },
      { start: '12:00', end: '14:00', available: true },
      { start: '14:00', end: '15:00', available: false },
      { start: '15:00', end: '19:00', available: true },
    ]);
    expect(result).toEqual({
      ok: true,
      data: [
        slot('08:00:00', '09:00:00'),
        slot('09:00:00', '10:00:00', false),
        slot('10:00:00', '11:00:00', false),
        slot('11:00:00', '12:00:00', false),
        slot('12:00:00', '13:00:00'),
        slot('13:00:00', '14:00:00'),
        slot('14:00:00', '15:00:00', false),
        slot('15:00:00', '16:00:00'),
        slot('16:00:00', '17:00:00'),
        slot('17:00:00', '18:00:00'),
        slot('18:00:00', '19:00:00'),
      ],
    });
  });

  it('trie les créneaux quel que soit l’ordre de saisie', () => {
    const result = splitIntoHourlySlots([
      { start: '14:00', end: '16:00', available: true },
      { start: '08:00', end: '09:00', available: false },
    ]);
    expect(result).toEqual({
      ok: true,
      data: [
        slot('08:00:00', '09:00:00', false),
        slot('14:00:00', '15:00:00'),
        slot('15:00:00', '16:00:00'),
      ],
    });
  });

  it('accepte des heures au format HH:MM:SS et laisse les trous', () => {
    const result = splitIntoHourlySlots([
      { start: '08:00:00', end: '09:00:00', available: true },
      { start: '18:00:00', end: '19:00:00', available: true },
    ]);
    expect(result).toEqual({
      ok: true,
      data: [slot('08:00:00', '09:00:00'), slot('18:00:00', '19:00:00')],
    });
  });

  it('accepte une journée vide', () => {
    expect(splitIntoHourlySlots([])).toEqual({ ok: true, data: [] });
  });

  it('gère les bornes de la journée', () => {
    const result = splitIntoHourlySlots([{ start: '00:00', end: '01:00', available: true }]);
    expect(result).toEqual({ ok: true, data: [slot('00:00:00', '01:00:00')] });
  });

  it('refuse une fin égale ou antérieure au début', () => {
    for (const end of ['10:00', '09:00']) {
      expect(
        splitIntoHourlySlots([
          { start: '08:00', end: '09:00', available: true },
          { start: '10:00', end, available: true },
        ]),
      ).toEqual({
        ok: false,
        error: { index: 1, message: 'L’heure de fin doit être après l’heure de début.' },
      });
    }
  });

  it('refuse une plage qui ne tombe pas à l’heure pile', () => {
    for (const range of [
      { start: '09:30', end: '11:00' },
      { start: '09:00', end: '10:15' },
    ]) {
      expect(splitIntoHourlySlots([{ ...range, available: true }])).toEqual({
        ok: false,
        error: { index: 0, message: 'Les créneaux commencent et finissent à l’heure pile.' },
      });
    }
  });

  it('refuse une heure manquante ou invalide', () => {
    for (const range of [
      { start: '', end: '10:00' },
      { start: '09:00', end: '24:00' },
      { start: '9h', end: '10:00' },
    ]) {
      expect(splitIntoHourlySlots([{ ...range, available: true }])).toEqual({
        ok: false,
        error: { index: 0, message: 'Indiquez une heure de début et de fin.' },
      });
    }
  });

  it('refuse des plages qui se chevauchent et désigne la plus récente dans la saisie', () => {
    expect(
      splitIntoHourlySlots([
        { start: '11:00', end: '13:00', available: true },
        { start: '15:00', end: '16:00', available: true },
        { start: '09:00', end: '12:00', available: false },
      ]),
    ).toEqual({
      ok: false,
      error: {
        index: 2,
        message: 'Les créneaux de 11:00 à 13:00 et de 09:00 à 12:00 se chevauchent.',
      },
    });
  });

  it('refuse deux plages identiques ou une plage incluse dans une autre', () => {
    const identical = splitIntoHourlySlots([
      { start: '09:00', end: '10:00', available: true },
      { start: '09:00', end: '10:00', available: false },
    ]);
    expect(identical.ok).toBe(false);
    const included = splitIntoHourlySlots([
      { start: '08:00', end: '19:00', available: true },
      { start: '12:00', end: '13:00', available: false },
    ]);
    expect(included).toEqual({
      ok: false,
      error: {
        index: 1,
        message: 'Les créneaux de 08:00 à 19:00 et de 12:00 à 13:00 se chevauchent.',
      },
    });
  });

  it('accepte des plages qui se touchent', () => {
    const result = splitIntoHourlySlots([
      { start: '10:00', end: '11:00', available: true },
      { start: '09:00', end: '10:00', available: true },
    ]);
    expect(result.ok).toBe(true);
  });
});
