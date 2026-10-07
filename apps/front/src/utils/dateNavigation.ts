/**
 * Navigation jour par jour sur des dates calendaires `YYYY-MM-DD` (sélecteur de date des écrans 02
 * et 10).
 *
 * Une date calendaire n'a ni heure ni fuseau : le calcul se fait en UTC (`Date.UTC`), où un jour
 * dure toujours 24 h. Le résultat ne dépend donc ni du fuseau de la machine ni des changements
 * d'heure. « Aujourd'hui en heure de Paris » est fourni par `todayInParis` (`utils/dates.ts`).
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

/** Vrai si `value` est une date calendaire `YYYY-MM-DD` qui existe (« 2026-02-29 » est faux). */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Ajoute `days` jours (négatif pour reculer) : `addDays('2026-12-31', 1)` → `'2027-01-01'`. */
export function addDays(date: string, days: number): string {
  if (!isIsoDate(date)) throw new RangeError(`Date invalide (YYYY-MM-DD attendu) : « ${date} »`);
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return `${pad(result.getUTCFullYear(), 4)}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())}`;
}

/** Jour précédent. */
export const previousDay = (date: string): string => addDays(date, -1);

/** Jour suivant. */
export const nextDay = (date: string): string => addDays(date, 1);

/**
 * Vrai si `date` est avant la borne `min` (bornes au format `YYYY-MM-DD` : l'ordre alphabétique est
 * l'ordre chronologique). Sans borne, rien n'est avant.
 */
export const isBefore = (date: string, min: string | undefined): boolean =>
  min !== undefined && min !== '' && date < min;
