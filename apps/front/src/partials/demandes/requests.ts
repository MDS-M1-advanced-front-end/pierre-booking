/**
 * Demandes de réservation de l'écran 11, en fonctions pures.
 *
 * - La liste vient de `listReservationRequests()` (GraphQL) : le back filtre les salles du
 *   gestionnaire, trie et limite. « En attente » : `PENDING`, la plus proche d'abord. « Traitées
 *   récemment » : `CONFIRMED`, `REJECTED` ou `COMPLETED`, la plus récente d'abord (le contrat ne
 *   donne pas la date de traitement : date de la réservation), au plus `HANDLED_LIMIT`.
 * - Les demandes sont ramenées au type `Reservation` du REST, celui de `ReservationItem` et des
 *   actions Confirmer / Refuser ; les noms de la salle et du demandeur sont gardés à part.
 */
import type { Reservation } from '@room-booking/core';
import type {
  ReservationRequestFieldsFragment,
  ReservationRequestsQuery,
} from '@room-booking/core/graphql';

/** Nombre maximal de demandes « Traitées récemment ». */
export const HANDLED_LIMIT = 10;

/** Listes de l'écran 11 et noms à afficher, par identifiant. */
export interface RequestLists {
  pending: Reservation[];
  handled: Reservation[];
  /** Nom de chaque salle, par `roomId`. */
  roomNames: Map<string, string>;
  /** Prénom et nom de chaque demandeur, par `userId`. */
  requesterNames: Map<string, string>;
}

/** Demande GraphQL → `Reservation` du REST (champs vides omis, comme dans le contrat REST). */
function toReservation(request: ReservationRequestFieldsFragment): Reservation {
  return {
    id: request.id,
    roomId: request.room.id,
    userId: request.requester.id,
    startAt: request.startAt,
    endAt: request.endAt,
    status: request.status,
    numberOfParticipants: request.numberOfParticipants ?? undefined,
    comment: request.comment ?? undefined,
    totalAmount: request.totalAmount,
    currency: request.currency,
  };
}

/**
 * Réponse de `listReservationRequests()` → listes de l'écran et noms à afficher.
 * @param data - Données de la requête GraphQL.
 */
export function toRequestLists({ reservationRequests }: ReservationRequestsQuery): RequestLists {
  const roomNames = new Map<string, string>();
  const requesterNames = new Map<string, string>();
  for (const request of [...reservationRequests.pending, ...reservationRequests.handled]) {
    roomNames.set(request.room.id, request.room.name);
    requesterNames.set(
      request.requester.id,
      `${request.requester.firstName} ${request.requester.lastName}`,
    );
  }
  return {
    pending: reservationRequests.pending.map(toReservation),
    handled: reservationRequests.handled.map(toReservation),
    roomNames,
    requesterNames,
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
