import { addDays, toParis } from '../../../../common/paris-time';
import {
  InvalidReservationException,
  InvalidStateTransitionException,
  ReservationConflictException,
} from '../exceptions/reservation-domain.exception';

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

/** Statuts qui occupent le créneau de la salle : une autre réservation ne peut pas le chevaucher. */
export const ACTIVE_RESERVATION_STATUSES = [
  ReservationStatus.PENDING,
  ReservationStatus.CONFIRMED,
];

/**
 * Machine à états : pour chaque statut, les statuts d'arrivée autorisés.
 * PENDING → PENDING correspond au déplacement d'une demande encore en attente ;
 * CONFIRMED → PENDING, au déplacement d'une réservation confirmée, à revalider.
 * REJECTED, CANCELLED et COMPLETED sont terminaux.
 */
const ALLOWED_RESERVATION_TRANSITIONS: Record<
  ReservationStatus,
  ReservationStatus[]
> = {
  [ReservationStatus.PENDING]: [
    ReservationStatus.PENDING,
    ReservationStatus.CONFIRMED,
    ReservationStatus.REJECTED,
    ReservationStatus.CANCELLED,
    ReservationStatus.REJECTED,
  ],
  [ReservationStatus.CONFIRMED]: [
    ReservationStatus.PENDING,
    ReservationStatus.CANCELLED,
    ReservationStatus.COMPLETED,
  ],
  [ReservationStatus.CANCELLED]: [],
  [ReservationStatus.REJECTED]: [],
  [ReservationStatus.COMPLETED]: [],
};

/**
 * Qui agit : le domaine ne connaît pas l'authentification, seulement ce qui compte pour les droits.
 * Construit par les controllers à partir de l'utilisateur connecté.
 */
export interface ReservationActor {
  id: string;
  isAdmin: boolean;
  isManager: boolean;
}

/** Données d'une réservation ; `id` et `createdAt` sont absents tant qu'elle n'est pas enregistrée. */
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

/**
 * Réservation d'une salle par un utilisateur, sur un créneau en UTC.
 * Porte le cycle de vie (voir `ReservationStatus`) et les règles de saisie d'un créneau.
 */
export class Reservation {
  readonly id?: string;
  readonly roomId: string;
  readonly userId: string;
  startAt: Date;
  endAt: Date;
  private _status: ReservationStatus;
  numberOfParticipants: number | null;
  comment: string | null;
  totalAmount: number;
  readonly currency: string;
  rejectionReason: string | null;
  readonly createdAt?: Date;

  /**
   * @param props - Données de la réservation, telles que lues en base ou à créer.
   */
  constructor(props: ReservationProps) {
    this.id = props.id;
    this.roomId = props.roomId;
    this.userId = props.userId;
    this.startAt = props.startAt;
    this.endAt = props.endAt;
    this._status = props.status;
    this.numberOfParticipants = props.numberOfParticipants;
    this.comment = props.comment;
    this.totalAmount = props.totalAmount;
    this.currency = props.currency;
    this.rejectionReason = props.rejectionReason;
    this.createdAt = props.createdAt;
  }

  /**
   * Créneau dans le futur, début avant la fin, sur une seule journée (heure de Paris).
   * Une fin à minuit le lendemain est acceptée.
   * @param startAt - Début du créneau.
   * @param endAt - Fin du créneau.
   * @param now - Instant de référence (l'instant courant par défaut).
   * @throws {InvalidReservationException} Début après la fin, créneau passé ou sur deux jours.
   */
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

  /**
   * Le nombre de participants ne doit pas dépasser la capacité de la salle.
   * @param capacity - Capacité de la salle.
   * @param numberOfParticipants - Participants annoncés ; absent ou null : pas de contrôle.
   * @throws {InvalidReservationException} Plus de participants que de places.
   */
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

  /**
   * Montant de la réservation : durée en heures × tarif horaire, arrondi au centime.
   * Figé à la réservation : le prix de la salle peut changer ensuite.
   * @param pricePerHour - Tarif horaire de la salle.
   * @param startAt - Début du créneau.
   * @param endAt - Fin du créneau.
   * @returns Le montant en euros.
   */
  static computeAmount(pricePerHour: number, startAt: Date, endAt: Date) {
    const hours = (endAt.getTime() - startAt.getTime()) / HOUR_MS;
    return Math.round(hours * pricePerHour * 100) / 100;
  }

  /** Statut courant, en lecture seule : il ne change que par les transitions (`confirm`, `reject`…). */
  get status(): ReservationStatus {
    return this._status;
  }

  /** Vrai si la réservation occupe son créneau (PENDING ou CONFIRMED). */
  get isActive(): boolean {
    return ACTIVE_RESERVATION_STATUSES.includes(this.status);
  }

  /**
   * @param actor - Utilisateur qui agit.
   * @returns Vrai si l'utilisateur a fait la réservation.
   */
  isAuthor(actor: ReservationActor): boolean {
    return this.userId === actor.id;
  }

  /**
   * Modifier, annuler : l'auteur ou un administrateur.
   * @param actor - Utilisateur qui agit.
   * @returns Vrai si l'utilisateur peut modifier ou annuler la réservation.
   */
  canBeEditedBy(actor: ReservationActor): boolean {
    return this.isAuthor(actor) || actor.isAdmin;
  }

  /**
   * Passe au statut demandé si la table des transitions l'autorise.
   * @param newStatus - Statut d'arrivée.
   * @throws {InvalidStateTransitionException} Transition non autorisée depuis le statut courant.
   */
  private transitionTo(newStatus: ReservationStatus): void {
    if (!ALLOWED_RESERVATION_TRANSITIONS[this.status].includes(newStatus)) {
      throw new InvalidStateTransitionException(this.status, newStatus);
    }

    this._status = newStatus;
  }

  /**
   * Confirme la réservation (gestionnaire de la salle ou administrateur) : PENDING → CONFIRMED.
   * @throws {InvalidStateTransitionException} Statut de départ autre que PENDING.
   */
  confirm(): void {
    this.transitionTo(ReservationStatus.CONFIRMED);
  }

  /**
   * Refuse la réservation (gestionnaire de la salle ou administrateur) : PENDING → REJECTED.
   * @param reason - Motif du refus, conservé s'il est donné.
   * @throws {InvalidStateTransitionException} Statut de départ autre que PENDING.
   */
  reject(reason?: string): void {
    this.transitionTo(ReservationStatus.REJECTED);
    if (reason) this.rejectionReason = reason;
  }

  /**
   * Annulation logique : la réservation reste consultable.
   * PENDING ou CONFIRMED → CANCELLED.
   * @throws {InvalidStateTransitionException} Statut de départ REJECTED, CANCELLED ou COMPLETED.
   */
  cancel(): void {
    this.transitionTo(ReservationStatus.CANCELLED);
  }

  /**
   * Exige une réservation PENDING ou CONFIRMED avant une modification ou une annulation.
   * @param action - Participe passé de l'action, pour le message d'erreur (« modifiée »…).
   * @throws {ReservationConflictException} Réservation REJECTED, CANCELLED ou COMPLETED.
   */
  assertActive(action: string): void {
    if (!this.isActive) {
      throw new ReservationConflictException(
        `Réservation au statut ${this.status} : elle ne peut pas être ${action}`,
      );
    }
  }

  /**
   * Déplace la réservation sur un nouveau créneau : PENDING ou CONFIRMED → PENDING.
   * Un nouveau créneau doit être revalidé par le gestionnaire.
   * L'appelant vérifie la validité et la disponibilité du créneau.
   * @param startAt - Nouveau début.
   * @param endAt - Nouvelle fin.
   * @param totalAmount - Montant recalculé pour le nouveau créneau.
   * @throws {InvalidStateTransitionException} Statut de départ REJECTED, CANCELLED ou COMPLETED.
   */
  reschedule(startAt: Date, endAt: Date, totalAmount: number): void {
    this.transitionTo(ReservationStatus.PENDING);
    this.startAt = startAt;
    this.endAt = endAt;
    this.totalAmount = totalAmount;
  }
}
