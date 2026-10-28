import { InvalidRoomException } from '../exceptions/room-domain.exception.js';

// Créneau d'une salle pour une date. Heures de Paris, au format HH:mm:ss (cf. docs/cadrage.md)
export class AvailabilitySlot {
  constructor(
    public readonly roomId: string,
    public readonly date: string,
    public readonly startTime: string,
    public readonly endTime: string,
    public readonly isAvailable: boolean,
  ) {}

  // Les créneaux d'une même journée : début avant la fin, sans chevauchement
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

  // Les créneaux ouverts couvrent-ils [startTime, endTime] sans interruption ?
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
