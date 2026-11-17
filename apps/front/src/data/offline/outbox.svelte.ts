// File d'attente des demandes de réservation faites hors ligne (cadrage.md § 2.10).
// Les demandes et les messages de retour sont gardés dans le localStorage, comme la session :
// ils survivent au rechargement et à la fermeture de l'onglet. L'envoi est fait par
// `data/reservations/pendingReservations.ts` ; ce module ne fait que stocker (pas d'appel à l'API,
// pour que la session puisse le vider sans dépendance circulaire).
import type { ReservationCreateRequest } from '@room-booking/core';

/** Clé du localStorage. */
export const OUTBOX_KEY = 'quorum.outbox';

/** Demande de réservation enregistrée sur l'appareil, en attente d'envoi. */
export interface PendingReservation {
  /** Identifiant local (pas celui de l'API). */
  id: string;
  /** Auteur de la demande : seul ce compte l'envoie. */
  userId: string;
  /** Nom de la salle au moment de la demande, pour l'affichage hors ligne. */
  roomName: string;
  /** Corps de `POST /reservations`, tel qu'il sera envoyé. */
  body: ReservationCreateRequest;
  /** Date de la mise en file, en millisecondes depuis l'époque Unix. */
  queuedAt: number;
}

/** Issue de l'envoi d'une demande, affichée jusqu'à ce que l'utilisateur la ferme. */
export interface OutboxNotice {
  id: string;
  userId: string;
  /** `sent` : la demande est arrivée au gestionnaire ; `rejected` : l'API l'a refusée. */
  kind: 'sent' | 'rejected';
  roomName: string;
  startAt: string;
  endAt: string;
  /** Motif du refus (`rejected`), en français. */
  reason?: string;
}

interface OutboxState {
  items: PendingReservation[];
  notices: OutboxNotice[];
}

/**
 * File réactive, partagée par la page. `sent` augmente à chaque demande arrivée à l'API : un
 * écran qui liste les réservations peut s'en servir pour se recharger. À lire seulement.
 */
export const outbox = $state<OutboxState & { sent: number }>({ items: [], notices: [], sent: 0 });

const isBrowser = typeof window !== 'undefined';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isPending = (value: unknown): value is PendingReservation =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.userId === 'string' &&
  typeof value.roomName === 'string' &&
  isRecord(value.body) &&
  typeof value.body.roomId === 'string' &&
  typeof value.body.startAt === 'string' &&
  typeof value.body.endAt === 'string';

const isNotice = (value: unknown): value is OutboxNotice =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.userId === 'string' &&
  (value.kind === 'sent' || value.kind === 'rejected') &&
  typeof value.roomName === 'string' &&
  typeof value.startAt === 'string' &&
  typeof value.endAt === 'string';

/** Lit le stockage ; une valeur illisible ou d'une autre version est ignorée. */
function read(): OutboxState {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(OUTBOX_KEY) ?? 'null');
    if (!isRecord(value)) return { items: [], notices: [] };
    return {
      items: Array.isArray(value.items) ? value.items.filter(isPending) : [],
      notices: Array.isArray(value.notices) ? value.notices.filter(isNotice) : [],
    };
  } catch {
    return { items: [], notices: [] };
  }
}

/**
 * Applique une modification au stockage puis à l'état réactif. Le stockage est relu à chaque
 * fois : un autre onglet a pu le modifier.
 */
function update(change: (state: OutboxState) => OutboxState): void {
  if (!isBrowser) return;
  const next = change(read());
  try {
    if (next.items.length === 0 && next.notices.length === 0) {
      window.localStorage.removeItem(OUTBOX_KEY);
    } else {
      window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(next));
    }
  } catch {
    // Stockage plein ou indisponible : la file ne vivra que le temps de la page.
  }
  outbox.items = next.items;
  outbox.notices = next.notices;
}

const newId = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

if (isBrowser) {
  Object.assign(outbox, read());
  // Autre onglet : même file
  window.addEventListener('storage', (event) => {
    if (event.key === OUTBOX_KEY || event.key === null) Object.assign(outbox, read());
  });
}

/**
 * Met une demande de réservation en file.
 * @param userId - Compte qui fait la demande.
 * @param roomName - Nom de la salle, pour l'affichage.
 * @param body - Corps de `POST /reservations`.
 * @returns La demande enregistrée.
 */
export function queueReservation(
  userId: string,
  roomName: string,
  body: ReservationCreateRequest,
): PendingReservation {
  const pending: PendingReservation = {
    id: newId(),
    userId,
    roomName,
    body,
    queuedAt: Date.now(),
  };
  update((state) => ({ ...state, items: [...state.items, pending] }));
  return pending;
}

/**
 * Retire une demande de la file (annulée par l'utilisateur avant l'envoi, ou traitée).
 * @param id - Identifiant local de la demande.
 * @param notice - Message à afficher sur son issue, s'il y en a un.
 */
export function settlePending(
  id: string,
  notice?: Omit<OutboxNotice, 'id' | 'userId' | 'roomName' | 'startAt' | 'endAt'>,
): void {
  update((state) => {
    const pending = state.items.find((item) => item.id === id);
    const items = state.items.filter((item) => item.id !== id);
    if (!pending || !notice) return { ...state, items };
    const added: OutboxNotice = {
      id: pending.id,
      userId: pending.userId,
      roomName: pending.roomName,
      startAt: pending.body.startAt,
      endAt: pending.body.endAt,
      ...notice,
    };
    return { items, notices: [...state.notices, added] };
  });
  if (notice?.kind === 'sent') outbox.sent += 1;
}

/**
 * Ferme un message de retour.
 * @param id - Identifiant du message.
 */
export function dismissNotice(id: string): void {
  update((state) => ({ ...state, notices: state.notices.filter((notice) => notice.id !== id) }));
}

/**
 * Vide la file et ses messages. Appelé quand la session est effacée : les demandes sont liées au
 * compte et contiennent des données personnelles (comme le cache de l'API).
 */
export function clearOutbox(): void {
  update(() => ({ items: [], notices: [] }));
}
