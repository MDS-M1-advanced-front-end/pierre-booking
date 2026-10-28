import type { AvailabilitySlot } from '../entities/availability.entity.js';

export interface AvailabilityRepositoryInterface {
  findByRoomAndDate(roomId: string, date: string): Promise<AvailabilitySlot[]>;
  // Créneaux ouverts de la date, toutes salles confondues, qui contiennent les heures données
  findOpenSlots(criteria: {
    date: string;
    startTime?: string;
    endTime?: string;
  }): Promise<AvailabilitySlot[]>;
  // Remplace tous les créneaux de la salle pour la date
  replaceDay(
    roomId: string,
    date: string,
    slots: AvailabilitySlot[],
  ): Promise<AvailabilitySlot[]>;
}

export const AVAILABILITY_REPOSITORY = 'AvailabilityRepositoryInterface';
