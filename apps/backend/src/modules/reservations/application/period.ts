import { addDays, fromParis } from '../../../common/paris-time';

/** Bornes sur la date de début des réservations : [from, before[ ; une borne absente n'est pas appliquée. */
export interface Period {
  from?: Date;
  before?: Date;
}

/**
 * Période des statistiques d'administration (REST et GraphQL).
 * @param from - Première date de Paris (YYYY-MM-DD), incluse, facultative.
 * @param to - Dernière date de Paris (YYYY-MM-DD), incluse, facultative.
 * @returns Les instants correspondants, à comparer aux dates UTC des réservations.
 */
export function toPeriod(from?: string, to?: string): Period {
  return {
    from: from ? fromParis(from) : undefined,
    before: to ? fromParis(addDays(to, 1)) : undefined,
  };
}
