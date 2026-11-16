import { Inject, Injectable } from '@nestjs/common';
import { ReservationNotFoundException } from '../../domain/exceptions/reservation-domain.exception';
import {
  RESERVATION_REQUESTS,
  type ReservationPageCriteria,
  type ReservationRequestsPort,
  type ReservationRequestView,
} from '../ports/reservation-requests.port';

/**
 * Réservations avec leur salle et leur demandeur, pour l'espace d'administration (GraphQL) :
 * liste de toutes les réservations, et relecture d'une réservation après une action.
 */
@Injectable()
export class BrowseReservationsUseCase {
  constructor(
    @Inject(RESERVATION_REQUESTS)
    private readonly views: ReservationRequestsPort,
  ) {}

  /**
   * @param criteria - Statut, salle, client (facultatifs) et pagination.
   * @returns Les réservations de la page, la plus récente d'abord, et le total.
   */
  page(
    criteria: ReservationPageCriteria,
  ): Promise<{ items: ReservationRequestView[]; total: number }> {
    return this.views.findPage(criteria);
  }

  /**
   * @param id - UUID de la réservation.
   * @returns La réservation, avec sa salle et son demandeur.
   * @throws {ReservationNotFoundException} Réservation introuvable.
   */
  async byId(id: string): Promise<ReservationRequestView> {
    const view = await this.views.findById(id);
    if (!view) throw new ReservationNotFoundException();
    return view;
  }
}
