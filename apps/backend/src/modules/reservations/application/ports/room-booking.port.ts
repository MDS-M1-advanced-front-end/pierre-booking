/**
 * Ce que les réservations lisent d'une salle : propriétaire (droits), capacité, tarif, statut.
 */
export interface BookableRoom {
  id: string;
  ownerId: string;
  capacity: number;
  pricePerHour: number;
  isActive: boolean;
}

/**
 * Ce que les réservations lisent des salles. Implémenté par `RoomBookingService` (module rooms).
 */
export interface RoomBookingPort {
  /**
   * @param roomId - UUID de la salle.
   * @returns La salle, ou null si elle n'existe pas.
   */
  findRoom(roomId: string): Promise<BookableRoom | null>;
  /**
   * Le créneau est-il couvert par des disponibilités ouvertes de la salle, sur une seule journée
   * (heure de Paris) ? Ne tient pas compte des autres réservations.
   * @param roomId - UUID de la salle.
   * @param startAt - Début du créneau.
   * @param endAt - Fin du créneau.
   * @returns Vrai si le créneau est ouvert à la réservation.
   */
  isSlotOpen(roomId: string, startAt: Date, endAt: Date): Promise<boolean>;
}

/** Jeton d'injection de `RoomBookingPort`. */
export const ROOM_BOOKING = 'RoomBookingPort';
