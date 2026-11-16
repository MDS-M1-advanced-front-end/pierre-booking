/**
 * Espace d'administration, en fonctions pures : libellés, lecture des paramètres d'adresse
 * (filtres et page, pour des listes partageables) et périodes du tableau de bord.
 */
import type { ReservationStatus, UserRole } from '@room-booking/core/graphql';
import { addDays } from '../../utils/dateNavigation';
import { todayInParis } from '../../utils/dates';

/** Taille de page des listes d'administration. */
export const ADMIN_PAGE_SIZE = 20;

export const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Client',
  GESTIONNAIRE: 'Gestionnaire',
  ADMINISTRATEUR: 'Administrateur',
};

export const ROLES = Object.keys(ROLE_LABELS) as UserRole[];

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmées',
  REJECTED: 'Refusées',
  CANCELLED: 'Annulées',
  COMPLETED: 'Terminées',
};

export const STATUSES = Object.keys(STATUS_LABELS) as ReservationStatus[];

/** Rôle lu dans l'adresse ; une valeur inconnue est ignorée. */
export const parseRole = (value: string | null): UserRole | null =>
  value !== null && Object.hasOwn(ROLE_LABELS, value) ? (value as UserRole) : null;

/** Statut lu dans l'adresse ; une valeur inconnue est ignorée. */
export const parseStatus = (value: string | null): ReservationStatus | null =>
  value !== null && Object.hasOwn(STATUS_LABELS, value) ? (value as ReservationStatus) : null;

/** Page lue dans l'adresse : entier à partir de 1, sinon 1. */
export const parsePage = (value: string | null): number => {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
};

/** Identifiant lu dans l'adresse : UUID, sinon ignoré (le back le refuserait en 400). */
export const parseId = (value: string | null): string | null =>
  value !== null && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;

/**
 * Adresse d'une liste avec ses paramètres ; les valeurs vides et la page 1 sont omises.
 * @param path - Chemin de la page.
 * @param params - Paramètres, ex. `{ statut: 'PENDING', page: 2 }`.
 */
export const listHref = (path: string, params: Record<string, string | number | null>): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === '' || (key === 'page' && value === 1)) continue;
    query.set(key, String(value));
  }
  const search = query.toString();
  return search ? `${path}?${search}` : path;
};

/** Périodes proposées par le tableau de bord. */
export const PERIODS = {
  '30j': { label: '30 jours', days: 30, granularity: 'DAY' },
  '12s': { label: '12 semaines', days: 12 * 7, granularity: 'WEEK' },
  '12m': { label: '12 mois', days: 365, granularity: 'MONTH' },
  tout: { label: 'Tout', days: null, granularity: 'MONTH' },
} as const;

export type PeriodKey = keyof typeof PERIODS;

/** Période lue dans l'adresse ; par défaut les 12 dernières semaines. */
export const parsePeriod = (value: string | null): PeriodKey =>
  value !== null && Object.hasOwn(PERIODS, value) ? (value as PeriodKey) : '12s';

/**
 * Bornes de la période (dates de Paris, incluses), qui se termine aujourd'hui.
 * @param key - Période choisie.
 * @param now - Instant de référence.
 * @returns `null` pour « Depuis le début » (aucune borne).
 */
export const periodRange = (
  key: PeriodKey,
  now: Date = new Date(),
): { from: string; to: string } | null => {
  const { days } = PERIODS[key];
  if (days === null) return null;
  const to = todayInParis(now);
  return { from: addDays(to, -(days - 1)), to };
};

/** « Léa Martin » */
export const fullName = (person: { firstName: string; lastName: string }): string =>
  `${person.firstName} ${person.lastName}`;

/** Pas de la série du tableau de bord (enum `Granularity` du schéma). */
export type Granularity = 'DAY' | 'WEEK' | 'MONTH';

/** Premier jour de l'intervalle qui contient `date` : le jour, le lundi ou le 1er du mois. */
export const bucketStart = (date: string, granularity: Granularity): string => {
  if (granularity === 'DAY') return date;
  if (granularity === 'MONTH') return `${date.slice(0, 7)}-01`;
  // Jour de la semaine en UTC sur une date seule : pas d'effet de fuseau
  const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
};

/** Intervalle suivant, à partir de son premier jour. */
const nextBucket = (start: string, granularity: Granularity): string => {
  if (granularity === 'DAY') return addDays(start, 1);
  if (granularity === 'WEEK') return addDays(start, 7);
  const [year, month] = start.split('-').map(Number) as [number, number];
  return month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
};

/**
 * Complète la série du tableau de bord : l'API n'envoie que les intervalles qui ont des
 * réservations, la courbe a besoin de tous, à zéro au besoin.
 * @param points - Points de l'API, triés ou non (`date` : premier jour de l'intervalle).
 * @param granularity - Pas de la série.
 * @param range - Période affichée ; sans période, du premier au dernier point.
 */
export const fillTimeline = <T extends { date: string }>(
  points: T[],
  granularity: Granularity,
  range: { from: string; to: string } | null,
  empty: (date: string) => T,
): T[] => {
  const byDate = new Map(points.map((point) => [point.date, point]));
  const dates = [...byDate.keys()].sort();
  const first = range ? bucketStart(range.from, granularity) : dates.at(0);
  const last = range ? bucketStart(range.to, granularity) : dates.at(-1);
  if (first === undefined || last === undefined) return [];
  const filled: T[] = [];
  for (let date = first; date <= last; date = nextBucket(date, granularity)) {
    filled.push(byDate.get(date) ?? empty(date));
  }
  return filled;
};

// Dates seules (YYYY-MM-DD) lues à midi UTC et formatées en UTC : le jour ne bouge pas avec le
// fuseau du navigateur.
const dayMonth = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
});
const monthYear = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  month: 'short',
  year: '2-digit',
});
const longMonthYear = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  month: 'long',
  year: 'numeric',
});

/**
 * Libellés d'un intervalle de la série : court pour l'axe, complet pour l'info-bulle et le tableau.
 * @param date - Premier jour de l'intervalle.
 * @param granularity - Pas de la série.
 */
export const bucketLabels = (
  date: string,
  granularity: Granularity,
): { label: string; detail: string } => {
  const day = new Date(`${date}T12:00:00Z`);
  if (granularity === 'MONTH') {
    return { label: monthYear.format(day), detail: longMonthYear.format(day) };
  }
  const short = dayMonth.format(day);
  return granularity === 'WEEK'
    ? { label: short, detail: `Semaine du ${short}` }
    : { label: short, detail: short };
};
