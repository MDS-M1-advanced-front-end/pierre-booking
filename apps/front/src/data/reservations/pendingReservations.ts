// Envoi des demandes de réservation mises en file hors ligne (cadrage.md § 2.10).
// Les demandes partent par `createReservation`, donc par `withSession` : le jeton est renouvelé
// s'il a expiré pendant la coupure (jeton de rafraîchissement valable 7 jours).
import type { ReservationCreateRequest } from '@room-booking/core';
import { restoreSession } from '../auth/session.svelte';
import { errorMessage } from '../errors';
import { isOffline } from '../offline/network.svelte';
import { outbox, settlePending, type PendingReservation } from '../offline/outbox.svelte';
import { createReservation, listMyReservations } from './reservations.queries';

/** Taille de page maximale de l'API : toutes les réservations d'un client tiennent en une page. */
const PAGE_SIZE = 100;

const SLOT_TAKEN = "Le créneau n'est plus libre : une autre réservation a été enregistrée.";

/**
 * Vrai si une réservation active du compte couvre déjà exactement ce créneau : la demande est
 * arrivée lors d'un envoi précédent dont la réponse s'est perdue (coupure pendant l'envoi).
 * `null` si on ne peut pas le savoir (réseau).
 */
async function alreadyCreated(body: ReservationCreateRequest): Promise<boolean | null> {
  const result = await listMyReservations({ pageSize: PAGE_SIZE });
  if (!result.ok) return null;
  const start = Date.parse(body.startAt);
  const end = Date.parse(body.endAt);
  return result.data.items.some(
    (reservation) =>
      reservation.roomId === body.roomId &&
      (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') &&
      Date.parse(reservation.startAt) === start &&
      Date.parse(reservation.endAt) === end,
  );
}

/**
 * Envoie une demande. Renvoie faux s'il faut s'arrêter là et réessayer plus tard (réseau, serveur
 * en panne, session expirée) : la demande reste alors en file.
 */
async function send(pending: PendingReservation): Promise<boolean> {
  const result = await createReservation(pending.body);
  if (result.ok) {
    settlePending(pending.id, { kind: 'sent' });
    return true;
  }
  const { status } = result.error;
  // 401 : `withSession` a déjà renvoyé vers la connexion
  if (status === 0 || status === 401 || status >= 500) return false;
  if (status === 409) {
    const created = await alreadyCreated(pending.body);
    if (created === null) return false;
    settlePending(
      pending.id,
      created ? { kind: 'sent' } : { kind: 'rejected', reason: SLOT_TAKEN },
    );
    return true;
  }
  settlePending(pending.id, { kind: 'rejected', reason: errorMessage(result.error) });
  return true;
}

let flushing: Promise<void> | null = null;

/**
 * Envoie, dans l'ordre, les demandes en attente du compte connecté. Sans effet hors ligne, sans
 * session ou côté serveur. Les appels simultanés partagent le même envoi.
 * @returns Une promesse résolue quand l'envoi est terminé (ou interrompu).
 */
export function sendPendingReservations(): Promise<void> {
  if (typeof window === 'undefined' || isOffline()) return Promise.resolve();
  flushing ??= (async () => {
    const user = restoreSession();
    if (!user) return;
    for (const pending of outbox.items.filter((item) => item.userId === user.id)) {
      if (!(await send(pending))) return;
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

let watching = false;

/**
 * Envoie les demandes en attente maintenant, puis à chaque retour de la connexion. À appeler une
 * fois par page (AppStatus).
 */
export function watchPendingReservations(): void {
  if (typeof window === 'undefined' || watching) return;
  watching = true;
  window.addEventListener('online', () => {
    void sendPendingReservations();
  });
  void sendPendingReservations();
}
