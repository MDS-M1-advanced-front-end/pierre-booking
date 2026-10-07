/**
 * Découpage des plages saisies par le gestionnaire en créneaux d'une heure (écran 10).
 *
 * Hypothèses :
 * - Les heures sont des heures de Paris, sans date ni fuseau (comme `AvailabilitySlot`).
 * - En entrée : `HH:MM` (valeur d'un `<input type="time">`) ou `HH:MM:SS`.
 * - En sortie : `HH:MM:SS`, le format renvoyé par le mock pour `AvailabilitySlot` (« 08:00:00 »).
 * - Une plage doit commencer et finir à l'heure pile, et finir le même jour : `24:00` n'existe pas
 *   au format `time`, donc le dernier créneau possible est 22:00–23:00.
 * - Des trous entre les plages sont permis (heures non proposées) ; des plages qui se touchent
 *   (09:00–12:00 puis 12:00–14:00) ne se chevauchent pas.
 */
import type { AvailabilitySlot, Result } from '@room-booking/core';
import { minutesToTime, shortTime, timeToMinutes } from './dates';

/** Une plage saisie dans le formulaire des disponibilités. */
export interface TimeRange {
  start: string;
  end: string;
  available: boolean;
}

/** Erreur de saisie : message en français et position de la plage fautive dans la liste reçue. */
export interface TimeRangeError {
  message: string;
  index: number;
}

const HOUR = 60;

const parse = (value: string): number | null => {
  try {
    return timeToMinutes(value);
  } catch {
    return null;
  }
};

/**
 * Vérifie les plages puis les découpe en créneaux d'une heure triés par heure de début.
 * Exemple : `[{ start: '09:00', end: '12:00', available: false }]` → 3 créneaux indisponibles
 * 09:00:00–10:00:00, 10:00:00–11:00:00, 11:00:00–12:00:00.
 */
export const splitIntoHourlySlots = (
  ranges: readonly TimeRange[],
): Result<AvailabilitySlot[], TimeRangeError> => {
  const parsed: { start: number; end: number; available: boolean; index: number }[] = [];

  for (const [index, range] of ranges.entries()) {
    const start = parse(range.start);
    const end = parse(range.end);
    if (start === null || end === null) {
      return { ok: false, error: { index, message: 'Indiquez une heure de début et de fin.' } };
    }
    if (end <= start) {
      return {
        ok: false,
        error: { index, message: 'L’heure de fin doit être après l’heure de début.' },
      };
    }
    if (start % HOUR !== 0 || end % HOUR !== 0) {
      return {
        ok: false,
        error: { index, message: 'Les créneaux commencent et finissent à l’heure pile.' },
      };
    }
    parsed.push({ start, end, available: range.available, index });
  }

  parsed.sort((a, b) => a.start - b.start);

  for (let i = 1; i < parsed.length; i++) {
    const previous = parsed[i - 1];
    const current = parsed[i];
    if (current.start < previous.end) {
      // On désigne la plage saisie en dernier, et on cite les deux dans l'ordre de saisie.
      const [first, second] =
        previous.index < current.index ? [previous, current] : [current, previous];
      const firstLabel = label(ranges[first.index]);
      const secondLabel = label(ranges[second.index]);
      return {
        ok: false,
        error: {
          index: second.index,
          message: `Les créneaux de ${firstLabel} et de ${secondLabel} se chevauchent.`,
        },
      };
    }
  }

  const slots: AvailabilitySlot[] = [];
  for (const range of parsed) {
    for (let minutes = range.start; minutes < range.end; minutes += HOUR) {
      slots.push({
        startTime: minutesToTime(minutes),
        endTime: minutesToTime(minutes + HOUR),
        available: range.available,
      });
    }
  }
  return { ok: true, data: slots };
};

const label = (range: TimeRange) => `${shortTime(range.start)} à ${shortTime(range.end)}`;
