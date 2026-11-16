import { Inject, Injectable } from '@nestjs/common';
import type {
  Reservation,
  ReservationActor,
} from '../../domain/entities/reservation.entity';
import {
  ReservationAccessDeniedException,
  ReservationNotFoundException,
} from '../../domain/exceptions/reservation-domain.exception';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryInterface,
} from '../../domain/repositories/reservation.repository.interface';
import { ROOM_BOOKING, type RoomBookingPort } from '../ports/room-booking.port';
import { findRoomOrFail, managesRoom } from '../room-access';

/** GET /reservations/{reservationId} : détail d'une réservation. */
@Injectable()
export class GetReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepositoryInterface,
    @Inject(ROOM_BOOKING) private readonly rooms: RoomBookingPort,
  ) {}

  /**
   * L'auteur, le gestionnaire de la salle ou un administrateur.
   * @param reservationId - UUID de la réservation.
   * @param actor - Utilisateur connecté.
   * @returns La réservation.
   * @throws {ReservationNotFoundException} Réservation ou salle introuvable.
   * @throws {ReservationAccessDeniedException} Ni auteur, ni gestionnaire de la salle, ni admin.
   */
  async execute(
    reservationId: string,
    actor: ReservationActor,
  ): Promise<Reservation> {
    const reservation =
      await this.reservationRepository.findById(reservationId);
    if (!reservation) throw new ReservationNotFoundException();
    if (!reservation.isAuthor(actor)) {
      const room = await findRoomOrFail(this.rooms, reservation.roomId);
      if (!managesRoom(room, actor)) {
        throw new ReservationAccessDeniedException();
      }
    }
    return reservation;
  }
}
