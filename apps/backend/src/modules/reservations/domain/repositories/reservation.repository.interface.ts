import type {
  Reservation,
  ReservationStatus,
} from '../entities/reservation.entity.js';

export interface ReservationSearchCriteria {
  userId?: string;
  // Réservations des salles de ce gestionnaire
  roomOwnerId?: string;
  roomId?: string;
  status?: ReservationStatus;
  // Bornes sur startAt : [startFrom, startBefore[
  startFrom?: Date;
  startBefore?: Date;
  page: number;
  pageSize: number;
}

export interface ReservationRepositoryInterface {
  findById(id: string): Promise<Reservation | null>;
  findPage(
    criteria: ReservationSearchCriteria,
  ): Promise<{ items: Reservation[]; total: number }>;
  // Une réservation active de la salle chevauche-t-elle [startAt, endAt[ ?
  hasOverlap(
    roomId: string,
    startAt: Date,
    endAt: Date,
    excludedReservationId?: string,
  ): Promise<boolean>;
  save(reservation: Reservation): Promise<Reservation>;
}

export const RESERVATION_REPOSITORY = 'ReservationRepositoryInterface';
