import { Inject, Injectable } from '@nestjs/common';
import type {
  Reservation,
  ReservationActor,
} from '../../domain/entities/reservation.entity.js';
import {
  ReservationAccessDeniedException,
  ReservationNotFoundException,
} from '../../domain/exceptions/reservation-domain.exception.js';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryInterface,
} from '../../domain/repositories/reservation.repository.interface.js';
import {
  ROOM_BOOKING,
  type RoomBookingPort,
} from '../ports/room-booking.port.js';
import { findRoomOrFail, managesRoom } from '../room-access.js';

@Injectable()
export class GetReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepositoryInterface,
    @Inject(ROOM_BOOKING) private readonly rooms: RoomBookingPort,
  ) {}

  // L'auteur, le gestionnaire de la salle ou un administrateur
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
