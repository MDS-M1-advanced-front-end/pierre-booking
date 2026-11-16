import { Inject, Injectable } from '@nestjs/common';
import {
  Reservation,
  ReservationStatus,
  type ReservationActor,
} from '../../domain/entities/reservation.entity';
import { ReservationConflictException } from '../../domain/exceptions/reservation-domain.exception';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryInterface,
} from '../../domain/repositories/reservation.repository.interface';
import { ROOM_BOOKING, type RoomBookingPort } from '../ports/room-booking.port';
import { findRoomOrFail } from '../room-access';

/**
 * POST /reservations : réserve une salle. La réservation est créée au statut PENDING, en attente
 * de confirmation par le gestionnaire.
 */
@Injectable()
export class CreateReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepositoryInterface,
    @Inject(ROOM_BOOKING) private readonly rooms: RoomBookingPort,
  ) {}

  /**
   * Vérifie la salle, le créneau et la capacité, puis enregistre la réservation au montant figé.
   * @param request - Salle, créneau (UTC), participants et commentaire.
   * @param actor - Utilisateur connecté, auteur de la réservation.
   * @returns La réservation créée (PENDING).
   * @throws {ReservationNotFoundException} Salle introuvable.
   * @throws {ReservationConflictException} Salle inactive, créneau hors disponibilités ou déjà réservé.
   * @throws {InvalidReservationException} Créneau invalide (passé, à l'envers, sur deux jours) ou
   *   capacité dépassée.
   */
  async execute(
    request: {
      roomId: string;
      startAt: Date;
      endAt: Date;
      numberOfParticipants?: number;
      comment?: string;
    },
    actor: ReservationActor,
  ): Promise<Reservation> {
    const room = await findRoomOrFail(this.rooms, request.roomId);
    if (!room.isActive) {
      throw new ReservationConflictException("La salle n'est pas réservable");
    }
    const { startAt, endAt } = request;
    Reservation.assertValidSlot(startAt, endAt);
    Reservation.assertCapacity(room.capacity, request.numberOfParticipants);
    await this.assertBookable(room.id, startAt, endAt);

    return this.reservationRepository.save(
      new Reservation({
        roomId: room.id,
        userId: actor.id,
        startAt,
        endAt,
        status: ReservationStatus.PENDING,
        numberOfParticipants: request.numberOfParticipants ?? null,
        comment: request.comment ?? null,
        totalAmount: Reservation.computeAmount(
          room.pricePerHour,
          startAt,
          endAt,
        ),
        currency: 'EUR',
        rejectionReason: null,
      }),
    );
  }

  private async assertBookable(roomId: string, startAt: Date, endAt: Date) {
    if (!(await this.rooms.isSlotOpen(roomId, startAt, endAt))) {
      throw new ReservationConflictException('Créneau indisponible');
    }
    if (await this.reservationRepository.hasOverlap(roomId, startAt, endAt)) {
      throw new ReservationConflictException('Créneau déjà réservé');
    }
  }
}
