/**
 * Tri des demandes de réservation de l'écran 11, en fonctions pures.
 *
 * Hypothèses :
 * - La liste vient de `listMyReservations()` : pour un gestionnaire, on suppose que la route renvoie
 *   les réservations de ses salles (anomalie 4, à faire confirmer par le module Back-end). Par
 *   prudence, si les salles du gestionnaire sont connues, on ne garde que les réservations dont la
 *   `roomId` en fait partie.
 * - « En attente » : statut `PENDING`, la plus proche d'abord (`startAt` croissant).
 * - « Traitées récemment » : `CONFIRMED`, `REJECTED` ou `COMPLETED`. Le contrat ne donne pas la date
 *   de traitement : on trie par date de la réservation, la plus récente d'abord, limité à
 *   `HANDLED_LIMIT`. Les annulées (`CANCELLED`) ne sont pas affichées.
 */
import type { Reservation, ReservationStatus } from '@room-booking/core';

/** Nombre maximal de demandes « Traitées récemment ». */
export const HANDLED_LIMIT = 10;

const HANDLED_STATUSES: readonly ReservationStatus[] = ['CONFIRMED', 'REJECTED', 'COMPLETED'];

const byStart = (a: Reservation, b: Reservation) => Date.parse(a.startAt) - Date.parse(b.startAt);

/**
 * Répartit les réservations en demandes en attente et demandes traitées.
 * @param reservations - Réservations reçues de l'API.
 * @param roomIds - Salles du gestionnaire ; `null` si elles sont inconnues (aucun filtre).
 */
export function splitRequests(
  reservations: readonly Reservation[],
  roomIds: ReadonlySet<string> | null = null,
): { pending: Reservation[]; handled: Reservation[] } {
  const own = roomIds ? reservations.filter((r) => roomIds.has(r.roomId)) : [...reservations];
  return {
    pending: own.filter((r) => r.status === 'PENDING').sort(byStart),
    handled: own
      .filter((r) => HANDLED_STATUSES.includes(r.status))
      .sort((a, b) => byStart(b, a))
      .slice(0, HANDLED_LIMIT),
  };
}

/**
 * Déplace une demande traitée en tête des « Traitées récemment », avec son nouveau statut.
 * @returns Les deux listes mises à jour (nouveaux tableaux).
 */
export function markHandled(
  lists: { pending: readonly Reservation[]; handled: readonly Reservation[] },
  reservation: Reservation,
  status: 'CONFIRMED' | 'REJECTED',
): { pending: Reservation[]; handled: Reservation[] } {
  return {
    pending: lists.pending.filter((r) => r.id !== reservation.id),
    handled: [
      { ...reservation, status },
      ...lists.handled.filter((r) => r.id !== reservation.id),
    ].slice(0, HANDLED_LIMIT),
  };
}
