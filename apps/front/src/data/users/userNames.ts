/**
 * Utilisateurs par identifiant, mis en cache (écran 11, noms des demandeurs).
 *
 * `Reservation` ne contient que `userId` (anomalie 8) : on appelle `getUser` une fois par
 * identifiant **distinct**, et le résultat est gardé en mémoire le temps de la page.
 * Les droits de `GET /users/{userId}` ne sont pas précisés par le contrat : un `403` (ou toute
 * autre erreur) laisse l'identifiant absent de la `Map`, et l'appelant affiche « Client ».
 * Une erreur n'est pas mise en cache : un nouvel appel retente l'identifiant.
 */
import type { User } from '@room-booking/core';
import { getUser } from './users.queries';

const cache = new Map<string, Promise<User | null>>();

function load(userId: string): Promise<User | null> {
  const cached = cache.get(userId);
  if (cached) return cached;
  const pending = getUser(userId).then((result) => {
    if (result.ok) return result.data;
    cache.delete(userId);
    return null;
  });
  cache.set(userId, pending);
  return pending;
}

/**
 * Charge les utilisateurs demandés (un appel par identifiant distinct, mis en cache).
 * @param ids - Identifiants, doublons permis.
 * @returns Les utilisateurs trouvés, par identifiant ; les identifiants en erreur sont absents.
 */
export async function getUsersByIds(ids: readonly string[]): Promise<Map<string, User>> {
  const distinct = [...new Set(ids)];
  const users = await Promise.all(distinct.map(load));
  const byId = new Map<string, User>();
  for (const [index, user] of users.entries()) {
    if (user) byId.set(distinct[index], user);
  }
  return byId;
}

/** Vide le cache (tests). */
export function clearUsersCache(): void {
  cache.clear();
}
