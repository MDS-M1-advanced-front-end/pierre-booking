import { afterEach, describe, expect, it } from 'vitest';
import { addDays, isBefore, isIsoDate, nextDay, previousDay } from './dateNavigation';

describe('isIsoDate', () => {
  it('accepte une date qui existe', () => {
    expect(isIsoDate('2026-11-16')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
  });

  it('refuse un format ou une date impossible', () => {
    expect(isIsoDate('2026-2-3')).toBe(false);
    expect(isIsoDate('16/11/2026')).toBe(false);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('')).toBe(false);
  });
});

describe('nextDay / previousDay', () => {
  it('avance et recule d’un jour dans le mois', () => {
    expect(nextDay('2026-11-16')).toBe('2026-11-17');
    expect(previousDay('2026-11-16')).toBe('2026-11-15');
  });

  it('change de mois', () => {
    expect(nextDay('2026-04-30')).toBe('2026-05-01');
    expect(previousDay('2026-05-01')).toBe('2026-04-30');
  });

  it('change d’année', () => {
    expect(nextDay('2026-12-31')).toBe('2027-01-01');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
  });

  it('gère le 29 février', () => {
    expect(nextDay('2028-02-28')).toBe('2028-02-29');
    expect(nextDay('2028-02-29')).toBe('2028-03-01');
    expect(nextDay('2026-02-28')).toBe('2026-03-01');
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
  });

  it('ne saute ni ne répète un jour aux changements d’heure de Paris', () => {
    // Passage à l'heure d'été : nuit du 28 au 29 mars 2026 ; à l'heure d'hiver : 24 au 25 octobre.
    expect(nextDay('2026-03-28')).toBe('2026-03-29');
    expect(nextDay('2026-03-29')).toBe('2026-03-30');
    expect(previousDay('2026-03-30')).toBe('2026-03-29');
    expect(nextDay('2026-10-24')).toBe('2026-10-25');
    expect(nextDay('2026-10-25')).toBe('2026-10-26');
    expect(previousDay('2026-10-26')).toBe('2026-10-25');
  });

  it('refuse une date invalide', () => {
    expect(() => nextDay('2026-02-30')).toThrow(RangeError);
  });
});

describe('addDays', () => {
  it('ajoute plusieurs jours, en avant ou en arrière', () => {
    expect(addDays('2026-10-07', 30)).toBe('2026-11-06');
    expect(addDays('2026-01-05', -10)).toBe('2025-12-26');
    expect(addDays('2026-10-07', 0)).toBe('2026-10-07');
  });
});

describe('fuseau de la machine', () => {
  const original = process.env.TZ;
  afterEach(() => {
    process.env.TZ = original;
  });

  it('donne le même résultat quel que soit le fuseau', () => {
    for (const zone of ['Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Europe/Paris']) {
      process.env.TZ = zone;
      expect(nextDay('2026-03-28')).toBe('2026-03-29');
      expect(previousDay('2026-10-26')).toBe('2026-10-25');
    }
  });
});

describe('isBefore', () => {
  it('compare à la borne minimale', () => {
    expect(isBefore('2026-10-06', '2026-10-07')).toBe(true);
    expect(isBefore('2026-10-07', '2026-10-07')).toBe(false);
    expect(isBefore('2026-10-08', '2026-10-07')).toBe(false);
  });

  it('sans borne, rien n’est avant', () => {
    expect(isBefore('1999-01-01', undefined)).toBe(false);
    expect(isBefore('1999-01-01', '')).toBe(false);
  });
});
