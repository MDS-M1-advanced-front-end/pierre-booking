import { addDays, toParis } from '../../../../common/paris-time.js';
import {
  InvalidReservationException,
  ReservationConflictException,
} from '../exceptions/reservation-domain.exception.js';

/**
 * Cycle de vie : PENDING à la création, puis CONFIRMED ou REJECTED (gestionnaire/admin).
 * PENDING ou CONFIRMED peut passer à CANCELLED. CONFIRMED passe à COMPLETED une fois endAt dépassé.
 */
export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

// Statuts qui occupent le créneau de la salle
export const ACTIVE_RESERVATION_STATUSES = [
  ReservationStatus.PENDING,
  ReservationStatus.CONFIRMED,
];

// Qui agit : le domaine ne connaît pas l'authentification
export interface ReservationActor {
  id: string;
  isAdmin: boolean;
  isManager: boolean;
}

export interface ReservationProps {
  id?: string;
  roomId: string;
  userId: string;
  startAt: Date;
  endAt: Date;
  status: ReservationStatus;
  numberOfParticipants: number | null;
  comment: string | null;
  totalAmount: number;
  currency: string;
  rejectionReason: string | null;
  createdAt?: Date;
}

const HOUR_MS = 60 * 60 * 1000;

export class Reservation {
  readonly id?: string;
  readonly roomId: string;
  readonly userId: string;
  startAt: Date;
  endAt: Date;
  status: ReservationStatus;
  numberOfParticipants: number | null;
  comment: string | null;
  totalAmount: number;
  readonly currency: string;
  rejectionReason: string | null;
  readonly createdAt?: Date;

  constructor(props: ReservationProps) {
    this.id = props.id;
    this.roomId = props.roomId;
    this.userId = props.userId;
    this.startAt = props.startAt;
    this.endAt = props.endAt;
    this.status = props.status;
    this.numberOfParticipants = props.numberOfParticipants;
    this.comment = props.comment;
    this.totalAmount = props.totalAmount;
    this.currency = props.currency;
    this.rejectionReason = props.rejectionReason;
    this.createdAt = props.createdAt;
  }

  // Créneau dans le futur, début avant la fin, sur une seule journée (heure de Paris)
  static assertValidSlot(startAt: Date, endAt: Date, now = new Date()): void {
    if (startAt >= endAt) {
      throw new InvalidReservationException('startAt doit précéder endAt');
    }
    if (startAt <= now) {
      throw new InvalidReservationException(
        'Le créneau doit être dans le futur',
      );
    }
    const start = toParis(startAt);
    const end = toParis(endAt);
    const endsAtMidnight =
      end.date === addDays(start.date, 1) && end.time === '00:00:00';
    if (end.date !== start.date && !endsAtMidnight) {
      throw new InvalidReservationException(
        'Une réservation doit tenir sur une seule journée',
      );
    }
  }

  static assertCapacity(
    capacity: number,
    numberOfParticipants?: number | null,
  ): void {
    if (numberOfParticipants != null && numberOfParticipants > capacity) {
      throw new InvalidReservationException(
        `La salle accueille au plus ${capacity} personnes`,
      );
    }
  }

  // Figé à la réservation : le prix de la salle peut changer ensuite
  static computeAmount(pricePerHour: number, startAt: Date, endAt: Date) {
    const hours = (endAt.getTime() - startAt.getTime()) / HOUR_MS;
    return Math.round(hours * pricePerHour * 100) / 100;
  }

  get isActive(): boolean {
    return ACTIVE_RESERVATION_STATUSES.includes(this.status);
  }

  isAuthor(actor: ReservationActor): boolean {
    return this.userId === actor.id;
  }

  // Modifier, annuler : l'auteur ou un administrateur
  canBeEditedBy(actor: ReservationActor): boolean {
    return this.isAuthor(actor) || actor.isAdmin;
  }

  assertActive(action: string): void {
    if (!this.isActive) {
      throw new ReservationConflictException(
        `Réservation au statut ${this.status} : elle ne peut pas être ${action}`,
      );
    }
  }

  // Un nouveau créneau doit être revalidé par le gestionnaire
  reschedule(startAt: Date, endAt: Date, totalAmount: number): void {
    this.startAt = startAt;
    this.endAt = endAt;
    this.totalAmount = totalAmount;
    this.status = ReservationStatus.PENDING;
  }

  confirm(): void {
    this.assertPending();
    this.status = ReservationStatus.CONFIRMED;
  }

  reject(reason?: string): void {
    this.assertPending();
    this.status = ReservationStatus.REJECTED;
    if (reason !== undefined) this.rejectionReason = reason;
  }

  // Annulation logique : la réservation reste consultable
  cancel(): void {
    this.assertActive('annulée');
    this.status = ReservationStatus.CANCELLED;
  }

  private assertPending(): void {
    if (this.status !== ReservationStatus.PENDING) {
      throw new ReservationConflictException(
        `Réservation au statut ${this.status} : seule une réservation PENDING peut être traitée`,
      );
    }
  }
}
