import type { ReservationActor } from '../domain/entities/reservation.entity.js';
import { ReservationNotFoundException } from '../domain/exceptions/reservation-domain.exception.js';
import type {
  BookableRoom,
  RoomBookingPort,
} from './ports/room-booking.port.js';

/**
 * Gestionnaire propriétaire de la salle ou administrateur : peut consulter, confirmer ou refuser
 * les réservations de la salle.
 * @param room - Salle de la réservation.
 * @param actor - Utilisateur qui agit.
 * @returns Vrai si l'utilisateur gère la salle.
 */
export const managesRoom = (room: BookableRoom, actor: ReservationActor) =>
  actor.isAdmin || room.ownerId === actor.id;

/**
 * Lit une salle à travers le port du module rooms.
 * @param rooms - Port de lecture des salles.
 * @param roomId - UUID de la salle.
 * @returns La salle.
 * @throws {ReservationNotFoundException} La salle n'existe pas.
 */
export async function findRoomOrFail(
  rooms: RoomBookingPort,
  roomId: string,
): Promise<BookableRoom> {
  const room = await rooms.findRoom(roomId);
  if (!room) throw new ReservationNotFoundException('Salle introuvable');
  return room;
}
