/**
 * Période occupée par une réservation active (PENDING ou CONFIRMED) d'une salle.
 * Les bornes sont des instants UTC, comme les réservations.
 */
export interface Occupancy {
  roomId: string;
  startAt: Date;
  endAt: Date;
}

/**
 * Port vers l'occupation des salles par les réservations. Le module rooms ne dépend pas du
 * module reservations : l'implémentation lit la table des réservations en lecture seule.
 */
export interface RoomOccupancyPort {
  /**
   * Liste les périodes occupées par les réservations actives des salles sur un intervalle.
   * @param roomIds - Salles concernées ; liste vide : aucun résultat.
   * @param from - Début de l'intervalle (inclus).
   * @param to - Fin de l'intervalle (exclue).
   * @param excludedReservationId - Réservation à ignorer (celle qu'on est en train de modifier).
   * @returns Les périodes qui chevauchent [from, to[.
   */
  findOccupied(
    roomIds: string[],
    from: Date,
    to: Date,
    excludedReservationId?: string,
  ): Promise<Occupancy[]>;
}

/** Jeton d'injection de {@link RoomOccupancyPort}. */
export const ROOM_OCCUPANCY = 'RoomOccupancyPort';
