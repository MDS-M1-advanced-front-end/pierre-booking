import { Inject, Injectable } from '@nestjs/common';
import { addDays, fromParis } from '../../../../common/paris-time.js';
import type {
  Reservation,
  ReservationActor,
  ReservationStatus,
} from '../../domain/entities/reservation.entity.js';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryInterface,
} from '../../domain/repositories/reservation.repository.interface.js';

/**
 * GET /reservations : celles de l'utilisateur connecté, ou, pour un gestionnaire,
 * celles de ses salles (écran « Demandes » du front, anomalie 4 de docs/cadrage.md).
 */
@Injectable()
export class ListReservationsUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepositoryInterface,
  ) {}

  /**
   * Liste les réservations visibles de l'utilisateur, de la plus récente à la plus ancienne.
   * @param filters - Statut, période (dates de Paris, bornes incluses) et pagination.
   * @param actor - Utilisateur connecté.
   * @returns Les réservations de la page et le nombre total de résultats.
   */
  execute(
    filters: {
      status?: ReservationStatus;
      /** Dates de Paris (YYYY-MM-DD), bornes incluses, sur la date de début. */
      from?: string;
      to?: string;
      page: number;
      pageSize: number;
    },
    actor: ReservationActor,
  ): Promise<{ items: Reservation[]; total: number }> {
    return this.reservationRepository.findPage({
      ...(actor.isManager ? { roomOwnerId: actor.id } : { userId: actor.id }),
      status: filters.status,
      startFrom: filters.from ? fromParis(filters.from) : undefined,
      startBefore: filters.to ? fromParis(addDays(filters.to, 1)) : undefined,
      page: filters.page,
      pageSize: filters.pageSize,
    });
  }
}
