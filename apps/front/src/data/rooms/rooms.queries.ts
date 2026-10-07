import type {
  AvailabilitySlot,
  AvailabilityUpdateRequest,
  PaginatedRooms,
  Result,
  Room,
  RoomAvailabilityQuery,
  RoomCreateRequest,
  RoomUpdateRequest,
  SearchRoomsQuery,
} from '@room-booking/core';
import * as api from '../client';
import { withSession } from '../errors';
import { mockRooms } from './rooms.mock';

// TODO: brancher sur searchRooms() de core (retiré au lot 3)
export const getRooms = async (): Promise<Room[]> => {
  return Promise.resolve(mockRooms);
};

/** Taille de page maximale acceptée par l'API (`pageSize` > 100 → 400). */
const PAGE_SIZE = 100;
/** Garde-fou contre une pagination qui ne finirait pas. */
const MAX_PAGES = 50;

/** Recherche paginée des salles. Route publique. */
export function searchRooms(query: SearchRoomsQuery = {}): Promise<Result<PaginatedRooms>> {
  return api.searchRooms(query);
}

/** Détail d'une salle. Route publique. */
export function getRoom(roomId: string): Promise<Result<Room>> {
  return api.getRoom(roomId);
}

/** Créneaux d'une salle pour une date. Route publique. */
export function getRoomAvailability(
  roomId: string,
  query: RoomAvailabilityQuery,
): Promise<Result<AvailabilitySlot[]>> {
  return api.getRoomAvailability(roomId, query);
}

/** Ajoute une salle (gestionnaire, administrateur). */
export function createRoom(body: RoomCreateRequest): Promise<Result<Room>> {
  return withSession(api.createRoom(body));
}

/** Modifie une salle : envoyer l'objet complet (anomalie 2). */
export function updateRoom(roomId: string, body: RoomUpdateRequest): Promise<Result<Room>> {
  return withSession(api.updateRoom(roomId, body));
}

/** Supprime une salle. */
export function deleteRoom(roomId: string): Promise<Result<void>> {
  return withSession(api.deleteRoom(roomId));
}

/** Remplace les créneaux d'une salle pour une date. */
export function setRoomAvailability(
  roomId: string,
  body: AvailabilityUpdateRequest,
): Promise<Result<AvailabilitySlot[]>> {
  return withSession(api.setRoomAvailability(roomId, body));
}

/**
 * Parcourt toutes les pages de `GET /rooms`. Une salle déjà vue n'est pas ajoutée deux fois
 * (le mock Prism ignore `page` et renvoie toujours la même page).
 */
async function searchAllRooms(): Promise<Result<Room[]>> {
  const rooms = new Map<string, Room>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await api.searchRooms({ page, pageSize: PAGE_SIZE });
    if (!result.ok) return result;
    const items = result.data.items ?? [];
    for (const room of items) rooms.set(room.id, room);
    const total = result.data.total ?? rooms.size;
    if (items.length === 0 || rooms.size >= total || (result.data.page ?? page) !== page) break;
  }
  return { ok: true, data: [...rooms.values()] };
}

/**
 * Salles d'un gestionnaire. `GET /rooms` n'a pas de filtre `ownerId` (anomalie 5) :
 * toutes les pages sont lues puis filtrées côté client.
 * @param ownerId - UUID du gestionnaire.
 */
export async function listRoomsOfOwner(ownerId: string): Promise<Result<Room[]>> {
  const result = await searchAllRooms();
  if (!result.ok) return result;
  return { ok: true, data: result.data.filter((room) => room.ownerId === ownerId) };
}

const collator = new Intl.Collator('fr');

/**
 * Lieux des salles, distincts et triés en français. Aucun endpoint ne les liste (anomalie 13) :
 * la liste est déduite de toutes les salles, un nouveau lieu apparaît donc sans changer le code.
 */
export async function listLocations(): Promise<Result<string[]>> {
  const result = await searchAllRooms();
  if (!result.ok) return result;
  const locations = new Set(
    result.data.map((room) => room.location.trim()).filter((location) => location !== ''),
  );
  return { ok: true, data: [...locations].sort(collator.compare) };
}
