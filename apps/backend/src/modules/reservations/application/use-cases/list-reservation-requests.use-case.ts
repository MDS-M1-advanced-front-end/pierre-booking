import { Inject, Injectable } from '@nestjs/common';
import {
  ReservationStatus,
  type ReservationActor,
} from '../../domain/entities/reservation.entity';
import {
  RESERVATION_REQUESTS,
  type ReservationRequestsPort,
  type ReservationRequestView,
} from '../ports/reservation-requests.port';

/** Demandes traitées : acceptées (même passées) ou refusées. Les annulées ne sont pas montrées. */
const HANDLED_STATUSES = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.REJECTED,
  ReservationStatus.COMPLETED,
];

/**
 * Demandes de réservation de l'écran « Demandes » (GraphQL) : celles des salles du gestionnaire,
 * ou de toutes les salles pour un administrateur (même règle que `managesRoom`).
 */
@Injectable()
export class ListReservationRequestsUseCase {
  constructor(
    @Inject(RESERVATION_REQUESTS)
    private readonly requests: ReservationRequestsPort,
  ) {}

  /**
   * @param actor - Gestionnaire ou administrateur connecté.
   * @param limit - Nombre de demandes.
   * @returns Les demandes en attente, la plus proche d'abord.
   */
  pending(
    actor: ReservationActor,
    limit: number,
  ): Promise<ReservationRequestView[]> {
    return this.requests.find({
      ...scopeOf(actor),
      statuses: [ReservationStatus.PENDING],
      order: 'ASC',
      limit,
    });
  }

  /**
   * @param actor - Gestionnaire ou administrateur connecté.
   * @param limit - Nombre de demandes.
   * @returns Les demandes traitées, la plus récente d'abord (date de début : la date de
   *   traitement n'est pas enregistrée).
   */
  handled(
    actor: ReservationActor,
    limit: number,
  ): Promise<ReservationRequestView[]> {
    return this.requests.find({
      ...scopeOf(actor),
      statuses: HANDLED_STATUSES,
      order: 'DESC',
      limit,
    });
  }
}

/** Un administrateur voit toutes les salles, un gestionnaire les siennes. */
const scopeOf = (actor: ReservationActor) =>
  actor.isAdmin ? {} : { roomOwnerId: actor.id };
