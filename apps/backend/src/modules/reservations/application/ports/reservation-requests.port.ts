import type { RoomStatus } from '../../../rooms/domain/entities/room.entity';
import type { ReservationStatus } from '../../domain/entities/reservation.entity';

/** Réservation avec sa salle et son demandeur (écran « Demandes », administration). */
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
  rejectionReason: string | null;
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

/** Filtres et pagination de la liste de toutes les réservations (administration). */
export interface ReservationPageCriteria {
  status?: ReservationStatus;
  roomId?: string;
  userId?: string;
  /** Page, à partir de 1. */
  page: number;
  pageSize: number;
}

/**
 * Lecture des réservations avec leur salle et leur demandeur (jointure réservations, salles,
 * utilisateurs), pour l'API GraphQL du back-office : écran « Demandes » et administration.
 */
export interface ReservationRequestsPort {
  /**
   * @param criteria - Salles, statuts, ordre et nombre de demandes.
   * @returns Les demandes, avec leur salle et leur demandeur.
   */
  find(criteria: ReservationRequestCriteria): Promise<ReservationRequestView[]>;

  /**
   * @param criteria - Filtres facultatifs et pagination.
   * @returns Les réservations de la page, la plus récente (date de début) d'abord, et le total.
   */
  findPage(
    criteria: ReservationPageCriteria,
  ): Promise<{ items: ReservationRequestView[]; total: number }>;

  /**
   * @param id - UUID de la réservation.
   * @returns La réservation, ou `null` si elle n'existe pas.
   */
  findById(id: string): Promise<ReservationRequestView | null>;
}

/** Jeton d'injection de `ReservationRequestsPort`. */
export const RESERVATION_REQUESTS = 'ReservationRequestsPort';
