import type {
  Reservation,
  ReservationStatus,
} from '../entities/reservation.entity';

/** Filtres et pagination d'une liste de réservations ; les filtres absents sont ignorés. */
export interface ReservationSearchCriteria {
  userId?: string;
  /** Réservations des salles de ce gestionnaire. */
  roomOwnerId?: string;
  roomId?: string;
  status?: ReservationStatus;
  /** Bornes sur startAt : [startFrom, startBefore[. */
  startFrom?: Date;
  startBefore?: Date;
  page: number;
  pageSize: number;
}

/** Persistance des réservations (implémentée par `TypeormReservationRepository`). */
export interface ReservationRepositoryInterface {
  /**
   * @param id - UUID de la réservation.
   * @returns La réservation, ou null si elle n'existe pas.
   */
  findById(id: string): Promise<Reservation | null>;
  /**
   * Page de réservations, de la plus récente à la plus ancienne (date de début).
   * @param criteria - Filtres et pagination.
   * @returns Les réservations de la page et le nombre total de résultats.
   */
  findPage(
    criteria: ReservationSearchCriteria,
  ): Promise<{ items: Reservation[]; total: number }>;
  /**
   * Une réservation active (PENDING ou CONFIRMED) de la salle chevauche-t-elle [startAt, endAt[ ?
   * @param roomId - Salle concernée.
   * @param startAt - Début du créneau.
   * @param endAt - Fin du créneau.
   * @param excludedReservationId - Réservation à ignorer (celle qu'on déplace).
   * @returns Vrai si le créneau est déjà pris.
   */
  hasOverlap(
    roomId: string,
    startAt: Date,
    endAt: Date,
    excludedReservationId?: string,
  ): Promise<boolean>;
  /**
   * Crée ou met à jour une réservation.
   * @param reservation - Réservation à enregistrer.
   * @returns La réservation telle qu'enregistrée (identifiant et date de création compris).
   */
  save(reservation: Reservation): Promise<Reservation>;
}

/** Jeton d'injection de `ReservationRepositoryInterface`. */
export const RESERVATION_REPOSITORY = 'ReservationRepositoryInterface';
