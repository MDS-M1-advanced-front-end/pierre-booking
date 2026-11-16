// Les créneaux (date + heure) sont en heure de Paris, les réservations en UTC (cf. docs/cadrage.md)
const TIME_ZONE = 'Europe/Paris';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/**
 * Met une heure au format de la base.
 * @param time - Heure au format `HH:mm` ou `HH:mm:ss`.
 * @returns L'heure au format `HH:mm:ss`.
 */
export function normalizeTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

/**
 * Date et heure de Paris d'un instant.
 * @param instant - Instant à convertir (ex. `startAt` d'une réservation, en UTC).
 * @returns La date (`YYYY-MM-DD`) et l'heure (`HH:mm:ss`) à Paris.
 */
export function toParis(instant: Date): { date: string; time: string } {
  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

/**
 * Instant correspondant à une date et une heure de Paris, changements d'heure compris.
 * @param date - Date de Paris, `YYYY-MM-DD`.
 * @param time - Heure de Paris, `HH:mm` ou `HH:mm:ss` (minuit par défaut).
 * @returns L'instant, à comparer aux dates UTC des réservations.
 */
export function fromParis(date: string, time = '00:00:00'): Date {
  const asUtc = Date.parse(`${date}T${normalizeTime(time)}Z`);
  // Décalage de Paris par rapport à UTC à un instant donné (+1 h ou +2 h)
  const offsetAt = (instant: number) => {
    const paris = toParis(new Date(instant));
    return Date.parse(`${paris.date}T${paris.time}Z`) - instant;
  };
  // Deux passes pour tomber juste autour des changements d'heure
  const guess = asUtc - offsetAt(asUtc);
  return new Date(asUtc - offsetAt(guess));
}

/**
 * Ajoute des jours à une date sans heure.
 * @param date - Date, `YYYY-MM-DD`.
 * @param days - Nombre de jours, négatif pour reculer.
 * @returns La nouvelle date, `YYYY-MM-DD`.
 */
export function addDays(date: string, days: number): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}
