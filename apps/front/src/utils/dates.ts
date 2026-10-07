/**
 * Dates et heures de l'application (cadrage § 2.7).
 *
 * Hypothèses :
 * - `Reservation.startAt` / `endAt` sont des instants ISO 8601 en UTC (`…Z`) ; on les affiche
 *   toujours en heure de Paris (`Europe/Paris`), en français, quel que soit le fuseau du
 *   navigateur ou du serveur.
 * - Les heures des créneaux (`AvailabilitySlot.startTime` / `endTime`, format `time`) n'ont pas de
 *   fuseau : on les considère en **heure de Paris**. Le mock les renvoie en `HH:MM:SS`
 *   (« 08:00:00 ») ; les fonctions d'ici acceptent aussi `HH:MM`.
 * - Les dates « calendaires » (`YYYY-MM-DD`, paramètre `date` des disponibilités) désignent un jour
 *   de Paris, sans heure : elles sont formatées sans aucun décalage de fuseau.
 * - Le passage heure de Paris → UTC utilise le décalage réel d'Europe/Paris à cette date (lu avec
 *   `Intl`), donc gère les changements d'heure. Heure inexistante (nuit de mars, 02:30) : décalée
 *   d'une heure plus tard (03:30) ; heure ambiguë (nuit d'octobre, 02:30) : première occurrence
 *   (heure d'été). C'est la règle `compatible` de `Temporal`.
 *
 * Les textes produits par `Intl` peuvent contenir des espaces insécables : ne pas les comparer à des
 * chaînes écrites avec des espaces ordinaires.
 */

export const TIME_ZONE = 'Europe/Paris';
const LOCALE = 'fr-FR';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const paris = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, ...options });

const longDate = paris({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = paris({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const time = paris({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dayOfMonth = paris({ day: 'numeric' });
const shortMonth = paris({ month: 'short' });
const dayMonthYear = paris({ day: 'numeric', month: 'long', year: 'numeric' });
// Une date calendaire n'a pas de fuseau : on la place à midi UTC et on la formate en UTC.
const longCalendarDate = new Intl.DateTimeFormat(LOCALE, {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
// Composantes numériques en heure de Paris (indépendantes de la langue).
const parisParts = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const pad = (value: number) => String(value).padStart(2, '0');

/** « 2026-11-16T14:00:00Z » → « lundi 16 novembre 2026 » (jour de Paris). */
export const formatDate = (iso: string): string => longDate.format(new Date(iso));

/** « 2026-11-16T14:00:00Z » → « lun. 16 nov. 2026 ». */
export const formatShortDate = (iso: string): string => shortDate.format(new Date(iso));

/** « 2026-11-16T14:00:00Z » → « 15:00 » (heure de Paris, 00 à 23). */
export const formatTime = (iso: string): string => time.format(new Date(iso));

/** Début et fin → « lundi 12 octobre 2026, de 11:00 à 14:00 ». */
export const formatDateRange = (startIso: string, endIso: string): string =>
  `${formatDate(startIso)}, de ${formatTime(startIso)} à ${formatTime(endIso)}`;

/** Bloc date des listes de réservations : « 2026-10-12T09:00:00Z » → `{ day: '12', month: 'oct.' }`. */
export const formatDayMonth = (iso: string): { day: string; month: string } => {
  const date = new Date(iso);
  return { day: dayOfMonth.format(date), month: shortMonth.format(date) };
};

/** Date calendaire « 2026-11-16 » → « lundi 16 novembre 2026 », sans décalage de fuseau. */
export const formatDateYmd = (ymd: string): string => {
  const { year, month, day } = parseYmd(ymd);
  return longCalendarDate.format(new Date(Date.UTC(year, month - 1, day, 12)));
};

/** Date d'inscription « 2026-02-11T08:30:00Z » → « 11 février 2026 ». */
export const formatMemberSince = (iso: string): string => dayMonthYear.format(new Date(iso));

/** Durée en heures entre deux instants (« 3 » pour 11:00 → 14:00). */
export const durationInHours = (startIso: string, endIso: string): number =>
  (Date.parse(endIso) - Date.parse(startIso)) / HOUR_MS;

/** Heure « HH:MM » ou « HH:MM:SS » → minutes depuis minuit. Lève une erreur si le format est invalide. */
export const timeToMinutes = (value: string): number => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(value);
  if (!match) throw new RangeError(`Heure invalide : « ${value} »`);
  return Number(match[1]) * 60 + Number(match[2]);
};

/** Minutes depuis minuit → « HH:MM:SS » (format du contrat et du mock). */
export const minutesToTime = (minutes: number): string =>
  `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`;

/** « 08:00:00 » ou « 08:00 » → « 08:00 » (affichage). */
export const shortTime = (value: string): string => {
  const minutes = timeToMinutes(value);
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
};

const parseYmd = (ymd: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) throw new RangeError(`Date invalide : « ${ymd} »`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
};

/** Composantes de l'heure de Paris à un instant donné. */
const partsInParis = (ms: number) => {
  const parts = parisParts.formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
};

/** Heure de Paris d'un instant, lue comme si c'était de l'UTC (en millisecondes, à la seconde près). */
const parisWallClockMs = (ms: number): number => {
  const p = partsInParis(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
};

/** Décalage d'Europe/Paris à un instant, en millisecondes (+1 h en hiver, +2 h en été). */
const parisOffsetMs = (ms: number): number => {
  const wholeSeconds = Math.floor(ms / 1000) * 1000;
  return parisWallClockMs(wholeSeconds) - wholeSeconds;
};

/** Jour courant à Paris, « YYYY-MM-DD ». */
export const todayInParis = (now: Date = new Date()): string =>
  utcIsoToParis(now.toISOString()).date;

/**
 * Date et heure de Paris → instant ISO UTC.
 * `parisToUtcIso('2026-11-16', '08:00:00')` → « 2026-11-16T07:00:00.000Z ».
 */
export const parisToUtcIso = (ymd: string, timeOfDay: string): string => {
  const { year, month, day } = parseYmd(ymd);
  const minutes = timeToMinutes(timeOfDay);
  // L'heure voulue, écrite comme si Paris était à UTC+0.
  const wallClock = Date.UTC(year, month - 1, day) + minutes * MINUTE_MS;
  // Les deux décalages possibles ce jour-là (avant et après un éventuel changement d'heure).
  const offsetBefore = parisOffsetMs(wallClock - DAY_MS);
  const offsetAfter = parisOffsetMs(wallClock + DAY_MS);
  const candidates = [wallClock - offsetBefore, wallClock - offsetAfter].filter(
    (ms) => parisWallClockMs(ms) === wallClock,
  );
  // Ambiguë : la plus tôt ; inexistante : décalée avec l'ancien décalage (donc plus tard).
  const utc = candidates.length > 0 ? Math.min(...candidates) : wallClock - offsetBefore;
  return new Date(utc).toISOString();
};

/** Instant ISO → date « YYYY-MM-DD » et heure « HH:MM » à Paris. */
export const utcIsoToParis = (iso: string): { date: string; time: string } => {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new RangeError(`Date invalide : « ${iso} »`);
  const p = partsInParis(ms);
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
  };
};
