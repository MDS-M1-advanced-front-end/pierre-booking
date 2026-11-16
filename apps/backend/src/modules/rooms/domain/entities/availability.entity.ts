import { InvalidRoomException } from '../exceptions/room-domain.exception';

/**
 * Créneau d'une salle pour une date. Heures de Paris, au format HH:mm:ss (cf. docs/cadrage.md) :
 * comparer les chaînes revient à comparer les heures.
 */
export class AvailabilitySlot {
  constructor(
    public readonly roomId: string,
    public readonly date: string,
    public readonly startTime: string,
    public readonly endTime: string,
    public readonly isAvailable: boolean,
  ) {}

  /**
   * Vérifie les créneaux d'une même journée : début avant la fin, sans chevauchement
   * (deux créneaux qui se touchent, 09:00-10:00 puis 10:00-11:00, sont acceptés).
   * @param slots - Créneaux de la journée, dans n'importe quel ordre.
   * @throws {InvalidRoomException} Un créneau finit avant de commencer, ou deux créneaux se chevauchent.
   */
  static assertValidDay(slots: AvailabilitySlot[]): void {
    const sorted = [...slots].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );
    sorted.forEach((slot, index) => {
      if (slot.startTime >= slot.endTime) {
        throw new InvalidRoomException(
          `Créneau ${slot.startTime}-${slot.endTime} : début après la fin`,
        );
      }
      const previous = sorted[index - 1];
      if (previous && previous.endTime > slot.startTime) {
        throw new InvalidRoomException('Des créneaux se chevauchent');
      }
    });
  }

  /**
   * Indique si les créneaux ouverts couvrent [startTime, endTime] sans interruption, en
   * enchaînant des créneaux contigus (une réservation de 09:00 à 11:00 sur 09:00-10:00 et 10:00-11:00).
   * @param slots - Créneaux de la journée ; les créneaux fermés sont ignorés.
   * @param startTime - Début de la plage (HH:mm:ss).
   * @param endTime - Fin de la plage (HH:mm:ss, ou 24:00:00 pour minuit le lendemain).
   * @returns true si toute la plage est couverte.
   */
  static cover(
    slots: AvailabilitySlot[],
    startTime: string,
    endTime: string,
  ): boolean {
    let coveredUntil = startTime;
    const open = slots
      .filter((slot) => slot.isAvailable)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (const slot of open) {
      if (slot.startTime <= coveredUntil && slot.endTime > coveredUntil) {
        coveredUntil = slot.endTime;
      }
    }
    return coveredUntil >= endTime;
  }
}
