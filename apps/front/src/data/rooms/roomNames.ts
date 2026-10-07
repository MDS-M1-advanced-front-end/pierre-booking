// Salles des listes de réservations (écrans 06 et 11, anomalie 8 du cadrage) : `Reservation` ne
// contient que `roomId`, il faut donc un `GET /rooms/{id}` par salle pour afficher son nom.
// Un seul appel par identifiant distinct, mis en cache en mémoire le temps de la page (le module
// est rechargé à chaque navigation, les pages connectées étant des pages Astro distinctes).
import type { Result, Room } from '@room-booking/core';
import { getRoom } from './rooms.queries';

/**
 * Appels en cours ou réussis, par identifiant. On garde la promesse (et non la salle) pour que deux
 * appels simultanés ne déclenchent qu'une requête. Un appel en erreur est retiré du cache : il sera
 * retenté au prochain `getRoomsByIds` (ex. bouton « Réessayer »).
 */
const cache = new Map<string, Promise<Result<Room>>>();

function fetchRoom(id: string): Promise<Result<Room>> {
  const cached = cache.get(id);
  if (cached) return cached;
  const call = getRoom(id).then((result) => {
    if (!result.ok) cache.delete(id);
    return result;
  });
  cache.set(id, call);
  return call;
}

/**
 * Salles correspondant à des identifiants : un `getRoom` par identifiant distinct, avec cache.
 * @param ids - Identifiants de salle, doublons permis (ex. `reservations.map((r) => r.roomId)`).
 * @returns Les salles trouvées, indexées par l'identifiant demandé. Un identifiant en erreur
 *   (salle supprimée, réseau…) est absent : l'appelant affiche « Salle inconnue ».
 */
export async function getRoomsByIds(ids: string[]): Promise<Map<string, Room>> {
  const distinct = [...new Set(ids)];
  const results = await Promise.all(distinct.map(async (id) => [id, await fetchRoom(id)] as const));
  const rooms = new Map<string, Room>();
  for (const [id, result] of results) if (result.ok) rooms.set(id, result.data);
  return rooms;
}

/** Vide le cache (tests). */
export function clearRoomsCache(): void {
  cache.clear();
}
