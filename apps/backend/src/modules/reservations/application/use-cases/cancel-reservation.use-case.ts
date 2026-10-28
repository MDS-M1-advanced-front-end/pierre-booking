import { Inject, Injectable } from '@nestjs/common';
import type { ReservationActor } from '../../domain/entities/reservation.entity.js';
import {
  ReservationAccessDeniedException,
  ReservationNotFoundException,
} from '../../domain/exceptions/reservation-domain.exception.js';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryInterface,
} from '../../domain/repositories/reservation.repository.interface.js';

/**
 * DELETE /reservations/{reservationId}. Annulation logique : la réservation passe à CANCELLED et
 * reste consultable.
 */
@Injectable()
export class CancelReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepositoryInterface,
  ) {}

  /**
   * Réservé à l'auteur ou à un administrateur.
   * @param reservationId - UUID de la réservation.
   * @param actor - Utilisateur connecté.
   * @throws {ReservationNotFoundException} Réservation introuvable.
   * @throws {ReservationAccessDeniedException} Ni auteur ni administrateur.
   * @throws {ReservationConflictException} Statut REJECTED, CANCELLED ou COMPLETED.
   */
  async execute(reservationId: string, actor: ReservationActor): Promise<void> {
    const reservation =
      await this.reservationRepository.findById(reservationId);
    if (!reservation) throw new ReservationNotFoundException();
    if (!reservation.canBeEditedBy(actor)) {
      throw new ReservationAccessDeniedException();
    }
    reservation.cancel();
    await this.reservationRepository.save(reservation);
  }
}
