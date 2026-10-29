import type { AvailabilitySlot } from '../entities/availability.entity';

/** Accès aux créneaux de disponibilité des salles. */
export interface AvailabilityRepositoryInterface {
  /**
   * Lit les créneaux d'une salle pour une journée, ouverts ou non.
   * @param roomId - Salle concernée.
   * @param date - Jour au format YYYY-MM-DD.
   * @returns Les créneaux, triés par heure de début.
   */
  findByRoomAndDate(roomId: string, date: string): Promise<AvailabilitySlot[]>;
  /**
   * Créneaux ouverts de la date, toutes salles confondues, qui contiennent les heures données.
   * @param criteria - Jour (YYYY-MM-DD) et heures (HH:mm:ss) que le créneau doit contenir.
   * @returns Les créneaux correspondants.
   */
  findOpenSlots(criteria: {
    date: string;
    startTime?: string;
    endTime?: string;
  }): Promise<AvailabilitySlot[]>;
  /**
   * Remplace tous les créneaux de la salle pour la date, en une transaction.
   * @param roomId - Salle concernée.
   * @param date - Jour au format YYYY-MM-DD.
   * @param slots - Nouveaux créneaux, déjà validés.
   * @returns Les créneaux enregistrés.
   */
  replaceDay(
    roomId: string,
    date: string,
    slots: AvailabilitySlot[],
  ): Promise<AvailabilitySlot[]>;
}

/** Jeton d'injection de {@link AvailabilityRepositoryInterface}. */
export const AVAILABILITY_REPOSITORY = 'AvailabilityRepositoryInterface';
