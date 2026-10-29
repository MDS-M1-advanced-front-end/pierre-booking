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

/**
 * POST /reservations/{reservationId}/confirm : confirme une demande.
 * Gestionnaire de la salle ou administrateur ; réservation PENDING seulement.
 */
@Injectable()
export class ConfirmReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepositoryInterface,
    @Inject(ROOM_BOOKING) private readonly rooms: RoomBookingPort,
  ) {}

  /**
   * @param reservationId - UUID de la réservation.
   * @param actor - Utilisateur connecté.
   * @returns La réservation, au statut CONFIRMED.
   * @throws {ReservationNotFoundException} Réservation ou salle introuvable.
   * @throws {ReservationAccessDeniedException} Ni gestionnaire de la salle ni administrateur.
   * @throws {ReservationConflictException} Statut autre que PENDING.
   */
  async execute(
    reservationId: string,
    actor: ReservationActor,
  ): Promise<Reservation> {
    const reservation =
      await this.reservationRepository.findById(reservationId);
    if (!reservation) throw new ReservationNotFoundException();
    const room = await findRoomOrFail(this.rooms, reservation.roomId);
    if (!managesRoom(room, actor)) throw new ReservationAccessDeniedException();
    reservation.confirm();
    // Envoi de la notification au client : service externe, non branché
    return this.reservationRepository.save(reservation);
  }
}
