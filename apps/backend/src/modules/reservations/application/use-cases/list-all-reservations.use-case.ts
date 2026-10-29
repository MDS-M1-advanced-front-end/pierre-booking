import { Inject, Injectable } from '@nestjs/common';
import type {
  Reservation,
  ReservationStatus,
} from '../../domain/entities/reservation.entity';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryInterface,
} from '../../domain/repositories/reservation.repository.interface';

/** GET /admin/reservations (administrateurs) : toutes les réservations de la plateforme. */
@Injectable()
export class ListAllReservationsUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepositoryInterface,
  ) {}

  /**
   * @param filters - Statut, salle, client et pagination ; les filtres absents sont ignorés.
   * @returns Les réservations de la page et le nombre total de résultats.
   */
  execute(filters: {
    status?: ReservationStatus;
    roomId?: string;
    userId?: string;
    page: number;
    pageSize: number;
  }): Promise<{ items: Reservation[]; total: number }> {
    return this.reservationRepository.findPage(filters);
  }
}
