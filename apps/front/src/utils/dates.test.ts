import { describe, expect, it } from 'vitest';
import {
  durationInHours,
  formatDate,
  formatDateRange,
  formatDateYmd,
  formatDayMonth,
  formatMemberSince,
  formatShortDate,
  formatTime,
  minutesToTime,
  parisToUtcIso,
  shortTime,
  timeToMinutes,
  todayInParis,
  utcIsoToParis,
} from './dates';

// Choix : on compare après normalisation des espaces. Avec l'ICU actuel de Node, les formats
// français utilisés ici ne produisent que des espaces ordinaires, mais `Intl` a déjà changé ses
// espaces d'une version d'ICU à l'autre (U+00A0, U+202F) : normaliser rend les tests stables sans
// masquer une vraie différence de texte.
const normalize = (text: string) => text.replace(/\s/g, ' ');

describe('formatDate / formatShortDate', () => {
  it('formate une date d’hiver en heure de Paris', () => {
    expect(normalize(formatDate('2026-11-16T14:00:00Z'))).toBe('lundi 16 novembre 2026');
    expect(normalize(formatShortDate('2026-11-16T14:00:00Z'))).toBe('lun. 16 nov. 2026');
  });

  it('formate une date d’été', () => {
    expect(normalize(formatDate('2026-07-14T08:00:00Z'))).toBe('mardi 14 juillet 2026');
    expect(normalize(formatShortDate('2026-07-14T08:00:00Z'))).toBe('mar. 14 juil. 2026');
  });

  it('prend le jour de Paris, pas le jour UTC, autour de minuit', () => {
    // 23:30Z le 15 novembre = 00:30 le 16 à Paris (UTC+1)
    expect(normalize(formatDate('2026-11-15T23:30:00Z'))).toBe('lundi 16 novembre 2026');
    // 22:30Z le 13 juillet = 00:30 le 14 à Paris (UTC+2)
    expect(normalize(formatDate('2026-07-13T22:30:00Z'))).toBe('mardi 14 juillet 2026');
  });
});

describe('formatTime', () => {
  it('convertit 09:00Z en 11:00 en octobre (heure d’été)', () => {
    expect(formatTime('2026-10-12T09:00:00Z')).toBe('11:00');
  });

  it('convertit en UTC+1 en hiver', () => {
    expect(formatTime('2026-11-16T14:00:00Z')).toBe('15:00');
  });

  it('affiche minuit 00:00, pas 24:00', () => {
    expect(formatTime('2026-10-11T22:00:00Z')).toBe('00:00');
    expect(formatTime('2026-12-31T23:00:00Z')).toBe('00:00');
  });

  it('suit les changements d’heure', () => {
    // 29 mars 2026 : 02:00 → 03:00 à 01:00Z
    expect(formatTime('2026-03-29T00:59:00Z')).toBe('01:59');
    expect(formatTime('2026-03-29T01:00:00Z')).toBe('03:00');
    // 25 octobre 2026 : 03:00 → 02:00 à 01:00Z
    expect(formatTime('2026-10-25T00:30:00Z')).toBe('02:30');
    expect(formatTime('2026-10-25T01:30:00Z')).toBe('02:30');
  });
});

describe('formatDateRange', () => {
  it('assemble la date et les heures de début et de fin', () => {
    expect(normalize(formatDateRange('2026-10-12T09:00:00Z', '2026-10-12T12:00:00Z'))).toBe(
      'lundi 12 octobre 2026, de 11:00 à 14:00',
    );
  });
});

describe('formatDayMonth', () => {
  it('donne le jour et le mois abrégé', () => {
    expect(formatDayMonth('2026-10-12T09:00:00Z')).toEqual({ day: '12', month: 'oct.' });
  });

  it('ne met pas de zéro devant un jour à un chiffre', () => {
    expect(formatDayMonth('2026-06-05T09:00:00Z')).toEqual({ day: '5', month: 'juin' });
  });

  it('prend le jour de Paris', () => {
    expect(formatDayMonth('2026-12-31T23:30:00Z')).toEqual({ day: '1', month: 'janv.' });
  });
});

describe('formatDateYmd', () => {
  it('formate une date calendaire', () => {
    expect(normalize(formatDateYmd('2026-11-16'))).toBe('lundi 16 novembre 2026');
  });

  it('ne décale pas la date, même en été ou un jour de changement d’heure', () => {
    expect(normalize(formatDateYmd('2026-07-01'))).toBe('mercredi 1 juillet 2026');
    expect(normalize(formatDateYmd('2026-03-29'))).toBe('dimanche 29 mars 2026');
    expect(normalize(formatDateYmd('2026-10-25'))).toBe('dimanche 25 octobre 2026');
  });

  it('refuse un format invalide', () => {
    expect(() => formatDateYmd('16/11/2026')).toThrow(RangeError);
  });
});

describe('formatMemberSince', () => {
  it('donne le jour, le mois et l’année', () => {
    expect(normalize(formatMemberSince('2026-02-11T08:30:00Z'))).toBe('11 février 2026');
  });
});

describe('durationInHours', () => {
  it('calcule la durée en heures', () => {
    expect(durationInHours('2026-10-12T09:00:00Z', '2026-10-12T12:00:00Z')).toBe(3);
    expect(durationInHours('2026-10-12T09:00:00Z', '2026-10-12T09:30:00Z')).toBe(0.5);
  });

  it('compte le temps réel écoulé pendant la nuit du changement d’heure', () => {
    // 00:00 → 04:00 à Paris le 29 mars : 3 h réelles
    expect(
      durationInHours(parisToUtcIso('2026-03-29', '00:00'), parisToUtcIso('2026-03-29', '04:00')),
    ).toBe(3);
  });
});

describe('heures des créneaux', () => {
  it('accepte HH:MM et HH:MM:SS', () => {
    expect(timeToMinutes('08:00')).toBe(480);
    expect(timeToMinutes('08:30:00')).toBe(510);
    expect(timeToMinutes('00:00:00')).toBe(0);
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('refuse une heure invalide', () => {
    for (const value of ['8:00', '24:00', '12:60', '12h00', '']) {
      expect(() => timeToMinutes(value)).toThrow(RangeError);
    }
  });

  it('produit le format du mock et un format court pour l’affichage', () => {
    expect(minutesToTime(480)).toBe('08:00:00');
    expect(minutesToTime(0)).toBe('00:00:00');
    expect(shortTime('08:00:00')).toBe('08:00');
    expect(shortTime('18:00')).toBe('18:00');
  });
});

describe('parisToUtcIso', () => {
  it('retire une heure en hiver', () => {
    expect(parisToUtcIso('2026-11-16', '08:00:00')).toBe('2026-11-16T07:00:00.000Z');
  });

  it('retire deux heures en été', () => {
    expect(parisToUtcIso('2026-10-12', '11:00')).toBe('2026-10-12T09:00:00.000Z');
  });

  it('gère minuit (veille en UTC)', () => {
    expect(parisToUtcIso('2026-11-16', '00:00')).toBe('2026-11-15T23:00:00.000Z');
    expect(parisToUtcIso('2026-07-14', '00:00')).toBe('2026-07-13T22:00:00.000Z');
  });

  it('passe à l’heure d’été le 29 mars 2026', () => {
    expect(parisToUtcIso('2026-03-29', '01:00')).toBe('2026-03-29T00:00:00.000Z');
    expect(parisToUtcIso('2026-03-29', '03:00')).toBe('2026-03-29T01:00:00.000Z');
    expect(parisToUtcIso('2026-03-29', '08:00')).toBe('2026-03-29T06:00:00.000Z');
    // La veille et le lendemain
    expect(parisToUtcIso('2026-03-28', '08:00')).toBe('2026-03-28T07:00:00.000Z');
    expect(parisToUtcIso('2026-03-30', '08:00')).toBe('2026-03-30T06:00:00.000Z');
  });

  it('décale une heure inexistante (02:30 le 29 mars) à 03:30', () => {
    expect(parisToUtcIso('2026-03-29', '02:30')).toBe('2026-03-29T01:30:00.000Z');
    expect(formatTime(parisToUtcIso('2026-03-29', '02:30'))).toBe('03:30');
  });

  it('revient à l’heure d’hiver le 25 octobre 2026', () => {
    expect(parisToUtcIso('2026-10-25', '01:00')).toBe('2026-10-24T23:00:00.000Z');
    expect(parisToUtcIso('2026-10-25', '03:00')).toBe('2026-10-25T02:00:00.000Z');
    expect(parisToUtcIso('2026-10-25', '08:00')).toBe('2026-10-25T07:00:00.000Z');
    expect(parisToUtcIso('2026-10-24', '08:00')).toBe('2026-10-24T06:00:00.000Z');
  });

  it('prend la première occurrence d’une heure ambiguë (02:30 le 25 octobre)', () => {
    expect(parisToUtcIso('2026-10-25', '02:30')).toBe('2026-10-25T00:30:00.000Z');
  });

  it('refuse une date ou une heure invalide', () => {
    expect(() => parisToUtcIso('2026-1-5', '08:00')).toThrow(RangeError);
    expect(() => parisToUtcIso('2026-11-16', '8h')).toThrow(RangeError);
  });
});

describe('utcIsoToParis', () => {
  it('donne la date et l’heure de Paris', () => {
    expect(utcIsoToParis('2026-10-12T09:00:00Z')).toEqual({ date: '2026-10-12', time: '11:00' });
    expect(utcIsoToParis('2026-11-16T07:00:00.000Z')).toEqual({
      date: '2026-11-16',
      time: '08:00',
    });
  });

  it('change de jour autour de minuit', () => {
    expect(utcIsoToParis('2026-11-15T23:00:00Z')).toEqual({ date: '2026-11-16', time: '00:00' });
  });

  it('est l’inverse de parisToUtcIso, y compris aux changements d’heure', () => {
    for (const [date, time] of [
      ['2026-01-15', '09:00'],
      ['2026-07-15', '18:00'],
      ['2026-03-29', '03:00'],
      ['2026-10-25', '01:00'],
      ['2026-10-25', '03:00'],
    ] as const) {
      expect(utcIsoToParis(parisToUtcIso(date, time))).toEqual({ date, time });
    }
  });

  it('refuse une date invalide', () => {
    expect(() => utcIsoToParis('pas une date')).toThrow(RangeError);
  });
});

describe('todayInParis', () => {
  it('donne le jour de Paris, qui peut différer du jour UTC', () => {
    expect(todayInParis(new Date('2026-11-15T23:30:00Z'))).toBe('2026-11-16');
    expect(todayInParis(new Date('2026-07-14T21:59:00Z'))).toBe('2026-07-14');
    expect(todayInParis(new Date('2026-07-14T22:00:00Z'))).toBe('2026-07-15');
  });

  it('utilise l’instant présent par défaut', () => {
    expect(todayInParis()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
