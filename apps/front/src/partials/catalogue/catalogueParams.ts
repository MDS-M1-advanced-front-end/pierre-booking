/**
 * Paramètres d'URL du catalogue (écran 01) : lecture, validation et construction des liens.
 *
 * Les filtres viennent d'un formulaire `GET`, donc de l'utilisateur : une valeur invalide (nombre,
 * date `YYYY-MM-DD`, heure `HH:MM`) est ignorée au lieu de provoquer une erreur `400` de l'API.
 */
import type { SearchRoomsQuery } from '@room-booking/core';
import { formatDateYmd, minutesToTime, shortTime, timeToMinutes } from '../../utils/dates';

/** Nombre de salles par page (comme la maquette). */
export const PAGE_SIZE = 6;

/** Bornes du contrat (`openapi.yml`, `GET /rooms`). */
const MAX_TEXT_LENGTH = 255;
const MAX_CAPACITY = 10_000;

/** Filtres validés, tels qu'ils s'affichent dans le formulaire (heures en `HH:MM`). */
export interface CatalogueFilters {
  search?: string;
  location?: string;
  capacityMin?: number;
  capacityMax?: number;
  /** `YYYY-MM-DD`. */
  date?: string;
  /** `HH:MM`. */
  startTime?: string;
  /** `HH:MM`. */
  endTime?: string;
  available?: boolean;
}

const text = (value: string | null): string | undefined => {
  const trimmed = value?.trim() ?? '';
  return trimmed !== '' && trimmed.length <= MAX_TEXT_LENGTH ? trimmed : undefined;
};

const integer = (value: string | null, min: number, max = Number.MAX_SAFE_INTEGER) => {
  if (value === null || !/^\d+$/.test(value.trim())) return undefined;
  const number = Number(value);
  return number >= min && number <= max ? number : undefined;
};

/** Date calendaire existante (`2026-02-30` est refusée). */
const calendarDate = (value: string | null): string | undefined => {
  const match = value === null ? null : /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const exists =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return exists ? match[0] : undefined;
};

/** Heure `HH:MM` ou `HH:MM:SS` → `HH:MM`. */
const timeOfDay = (value: string | null): string | undefined => {
  if (value === null) return undefined;
  try {
    return shortTime(value);
  } catch {
    return undefined;
  }
};

/** Lit et valide les filtres de l'URL. */
export function parseFilters(params: URLSearchParams): CatalogueFilters {
  const filters: CatalogueFilters = {
    search: text(params.get('search')),
    location: text(params.get('location')),
    capacityMin: integer(params.get('capacityMin'), 1, MAX_CAPACITY),
    capacityMax: integer(params.get('capacityMax'), 1, MAX_CAPACITY),
    date: calendarDate(params.get('date')),
    startTime: timeOfDay(params.get('startTime')),
    endTime: timeOfDay(params.get('endTime')),
    available: params.get('available') === 'true' || undefined,
  };
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined));
}

/** Page demandée (1 si absente ou invalide). */
export const parsePage = (params: URLSearchParams): number => integer(params.get('page'), 1) ?? 1;

/** Nombre de filtres renseignés (badge « N actifs »). */
export const countActiveFilters = (filters: CatalogueFilters): number =>
  Object.keys(filters).length;

/**
 * Requête `GET /rooms`. Le contrat attend des heures au format `time` (`HH:MM:SS`) : le mock
 * Prism refuse « 15:00 » (`400`), d'où la conversion depuis la valeur du champ.
 */
export function toSearchQuery(filters: CatalogueFilters, page: number): SearchRoomsQuery {
  const { startTime, endTime, ...rest } = filters;
  return {
    ...rest,
    ...(startTime && { startTime: minutesToTime(timeToMinutes(startTime)) }),
    ...(endTime && { endTime: minutesToTime(timeToMinutes(endTime)) }),
    page,
    pageSize: PAGE_SIZE,
  };
}

/** URL du catalogue avec ces filtres (et la page, omise si c'est la première). */
export function catalogueHref(filters: CatalogueFilters, page = 1): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) params.set(key, String(value));
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

const people = (count: number) => `${count} ${count > 1 ? 'personnes' : 'personne'}`;

/**
 * Phrase de la barre de résultats, sans le nombre de salles :
 * « pour 10 personnes ou plus, le lundi 16 novembre 2026 ».
 */
export function describeFilters(filters: CatalogueFilters): string {
  const { search, location, capacityMin: min, capacityMax: max, date } = filters;
  const words: string[] = [];
  if (search) words.push(`correspondant à « ${search} »`);
  if (location) words.push(`à ${location}`);
  if (min !== undefined && max !== undefined) {
    words.push(min === max ? `pour ${people(min)}` : `pour ${min} à ${people(max)}`);
  } else if (min !== undefined) {
    words.push(`pour ${people(min)} ou plus`);
  } else if (max !== undefined) {
    words.push(`pour ${people(max)} au plus`);
  }

  const when: string[] = [];
  if (date) when.push(`le ${formatDateYmd(date)}`);
  const { startTime: from, endTime: to } = filters;
  if (from && to) when.push(`de ${from} à ${to}`);
  else if (from) when.push(`à partir de ${from}`);
  else if (to) when.push(`jusqu'à ${to}`);

  return [words.join(' '), when.join(' ')].filter(Boolean).join(', ');
}
