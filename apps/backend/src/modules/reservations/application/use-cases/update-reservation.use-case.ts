import { Inject, Injectable } from '@nestjs/common';
import {
  Reservation,
  type ReservationActor,
} from '../../domain/entities/reservation.entity';
import {
  ReservationAccessDeniedException,
  ReservationConflictException,
  ReservationNotFoundException,
} from '../../domain/exceptions/reservation-domain.exception';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryInterface,
} from '../../domain/repositories/reservation.repository.interface';
import { ROOM_BOOKING, type RoomBookingPort } from '../ports/room-booking.port';
import { findRoomOrFail } from '../room-access';

/** PATCH /reservations/{reservationId} : modifie une réservation. */
@Injectable()
export class UpdateReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepositoryInterface,
    @Inject(ROOM_BOOKING) private readonly rooms: RoomBookingPort,
  ) {}

  /**
   * Réservation PENDING ou CONFIRMED ; un nouveau créneau la repasse en PENDING et recalcule le
   * montant. Réservé à l'auteur ou à un administrateur.
   * @param reservationId - UUID de la réservation.
   * @param changes - Champs à modifier ; absents : inchangés.
   * @param actor - Utilisateur connecté.
   * @returns La réservation modifiée.
   * @throws {ReservationNotFoundException} Réservation ou salle introuvable.
   * @throws {ReservationAccessDeniedException} Ni auteur ni administrateur.
   * @throws {ReservationConflictException} Statut REJECTED, CANCELLED ou COMPLETED ; nouveau
   *   créneau hors disponibilités ou déjà réservé.
   * @throws {InvalidReservationException} Nouveau créneau invalide ou capacité dépassée.
   */
  async execute(
    reservationId: string,
    changes: {
      startAt?: Date;
      endAt?: Date;
      numberOfParticipants?: number | null;
      comment?: string | null;
    },
    actor: ReservationActor,
  ): Promise<Reservation> {
    const reservation =
      await this.reservationRepository.findById(reservationId);
    if (!reservation) throw new ReservationNotFoundException();
    if (!reservation.canBeEditedBy(actor)) {
      throw new ReservationAccessDeniedException();
    }
    reservation.assertActive('modifiée');
    const room = await findRoomOrFail(this.rooms, reservation.roomId);

    const startAt = changes.startAt ?? reservation.startAt;
    const endAt = changes.endAt ?? reservation.endAt;
    const slotChanged =
      startAt.getTime() !== reservation.startAt.getTime() ||
      endAt.getTime() !== reservation.endAt.getTime();
    if (slotChanged) {
      Reservation.assertValidSlot(startAt, endAt);
      if (!(await this.rooms.isSlotOpen(room.id, startAt, endAt))) {
        throw new ReservationConflictException('Créneau indisponible');
      }
      if (
        await this.reservationRepository.hasOverlap(
          room.id,
          startAt,
          endAt,
          reservation.id,
        )
      ) {
        throw new ReservationConflictException('Créneau déjà réservé');
      }
      reservation.reschedule(
        startAt,
        endAt,
        Reservation.computeAmount(room.pricePerHour, startAt, endAt),
      );
    }
    if (changes.numberOfParticipants !== undefined) {
      Reservation.assertCapacity(room.capacity, changes.numberOfParticipants);
      reservation.numberOfParticipants = changes.numberOfParticipants;
    }
    if (changes.comment !== undefined) reservation.comment = changes.comment;

    return this.reservationRepository.save(reservation);
  }
}
