// Ce que les réservations lisent des salles. Implémenté par RoomBookingService (module rooms).
export interface BookableRoom {
  id: string;
  ownerId: string;
  capacity: number;
  pricePerHour: number;
  isActive: boolean;
}

export interface RoomBookingPort {
  findRoom(roomId: string): Promise<BookableRoom | null>;
  // Le créneau est-il couvert par des disponibilités ouvertes de la salle ?
  isSlotOpen(roomId: string, startAt: Date, endAt: Date): Promise<boolean>;
}

export const ROOM_BOOKING = 'RoomBookingPort';
