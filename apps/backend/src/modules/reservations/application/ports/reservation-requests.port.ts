import type { RoomStatus } from '../../../rooms/domain/entities/room.entity';
import type { ReservationStatus } from '../../domain/entities/reservation.entity';

/** Réservation vue par le gestionnaire de la salle, avec la salle et le demandeur. */
export interface ReservationRequestView {
  id: string;
  room: {
    id: string;
    name: string;
    location: string;
    capacity: number;
    pricePerHour: number;
    status: RoomStatus;
  };
  requester: { id: string; firstName: string; lastName: string; email: string };
  startAt: Date;
  endAt: Date;
  status: ReservationStatus;
  numberOfParticipants: number | null;
  comment: string | null;
  totalAmount: number;
  currency: string;
  createdAt: Date;
}

/** Critères d'une liste de demandes. */
export interface ReservationRequestCriteria {
  /** Salles de ce gestionnaire ; absent : toutes les salles. */
  roomOwnerId?: string;
  statuses: ReservationStatus[];
  /** Ordre sur la date de début ; à égalité, la plus ancienne demande d'abord. */
  order: 'ASC' | 'DESC';
  limit: number;
}

/**
 * Lecture des demandes de réservation de l'écran « Demandes » (jointure réservations, salles,
 * utilisateurs), pour l'API GraphQL du back-office.
 */
export interface ReservationRequestsPort {
  /**
   * @param criteria - Salles, statuts, ordre et nombre de demandes.
   * @returns Les demandes, avec leur salle et leur demandeur.
   */
  find(criteria: ReservationRequestCriteria): Promise<ReservationRequestView[]>;
}

/** Jeton d'injection de `ReservationRequestsPort`. */
export const RESERVATION_REQUESTS = 'ReservationRequestsPort';
