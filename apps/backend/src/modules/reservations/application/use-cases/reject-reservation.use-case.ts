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

// Gestionnaire de la salle ou administrateur ; réservation PENDING seulement
@Injectable()
export class RejectReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepositoryInterface,
    @Inject(ROOM_BOOKING) private readonly rooms: RoomBookingPort,
  ) {}

  async execute(
    reservationId: string,
    reason: string | undefined,
    actor: ReservationActor,
  ): Promise<Reservation> {
    const reservation =
      await this.reservationRepository.findById(reservationId);
    if (!reservation) throw new ReservationNotFoundException();
    const room = await findRoomOrFail(this.rooms, reservation.roomId);
    if (!managesRoom(room, actor)) throw new ReservationAccessDeniedException();
    reservation.reject(reason);
    // Envoi de la notification au client : service externe, non branché
    return this.reservationRepository.save(reservation);
  }
}
