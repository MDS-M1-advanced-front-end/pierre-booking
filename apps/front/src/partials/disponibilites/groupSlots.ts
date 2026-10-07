/**
 * Regroupement des créneaux d'une journée en plages éditables (écran 10), inverse de
 * `splitIntoHourlySlots` (`utils/splitIntoHourlySlots.ts`).
 *
 * Hypothèses :
 * - Les créneaux viennent de `getRoomAvailability` : heures de Paris, `HH:MM:SS` (mock) ou `HH:MM`.
 * - Deux créneaux sont regroupés s'ils se suivent sans trou (fin de l'un = début de l'autre) et
 *   ont la même disponibilité. Un trou horaire ou un changement de disponibilité ouvre une plage.
 * - Les plages produites sont au format `HH:MM`, la valeur d'un `<input type="time">`.
 * - Un créneau dont l'heure est illisible est ignoré (il ne peut pas être édité).
 *
 * Exemple : 08–09 libre, 09–10, 10–11, 11–12 indisponibles, 12–13 libre →
 * `[08:00–09:00 réservable, 09:00–12:00 non réservable, 12:00–13:00 réservable]`.
 */
import type { AvailabilitySlot } from '@room-booking/core';
import { minutesToTime, shortTime, timeToMinutes } from '../../utils/dates';
import type { TimeRange } from '../../utils/splitIntoHourlySlots';

interface ParsedSlot {
  start: number;
  end: number;
  available: boolean;
}

const parse = (slot: AvailabilitySlot): ParsedSlot | null => {
  try {
    return {
      start: timeToMinutes(slot.startTime),
      end: timeToMinutes(slot.endTime),
      available: slot.available,
    };
  } catch {
    return null;
  }
};

const toTime = (minutes: number) => shortTime(minutesToTime(minutes));

/** Regroupe les créneaux consécutifs de même disponibilité en plages triées par heure de début. */
export const groupSlots = (slots: readonly AvailabilitySlot[]): TimeRange[] => {
  const parsed = slots
    .map(parse)
    .filter((slot): slot is ParsedSlot => slot !== null && slot.end > slot.start)
    .sort((a, b) => a.start - b.start);

  const groups: ParsedSlot[] = [];
  for (const slot of parsed) {
    const last = groups.at(-1);
    if (last && last.end === slot.start && last.available === slot.available) {
      last.end = slot.end;
    } else {
      groups.push({ ...slot });
    }
  }

  return groups.map(({ start, end, available }) => ({
    start: toTime(start),
    end: toTime(end),
    available,
  }));
};
