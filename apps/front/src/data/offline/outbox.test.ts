import type { ReservationCreateRequest } from '@room-booking/core';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  OUTBOX_KEY,
  clearOutbox,
  dismissNotice,
  isQueued,
  keepOutboxOf,
  outbox,
  queueReservation,
  settlePending,
} from './outbox.svelte';

const body: ReservationCreateRequest = {
  roomId: 'r-1',
  startAt: '2026-11-20T09:00:00Z',
  endAt: '2026-11-20T11:00:00Z',
  numberOfParticipants: 4,
};

const stored = (): unknown => JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? 'null');

beforeEach(() => {
  clearOutbox();
  outbox.sent = 0;
});

describe('file des demandes hors ligne', () => {
  it('met une demande en file, dans l’état réactif et le stockage', () => {
    const pending = queueReservation('u-1', 'Salle Atlas', body);

    expect(outbox.items).toEqual([pending]);
    expect(pending).toMatchObject({ userId: 'u-1', roomName: 'Salle Atlas', body });
    expect(stored()).toEqual({ items: [pending], notices: [] });
  });

  it('une demande envoyée quitte la file et laisse un message', () => {
    const pending = queueReservation('u-1', 'Salle Atlas', body);
    settlePending(pending.id, { kind: 'sent' });

    expect(outbox.items).toEqual([]);
    expect(outbox.sent).toBe(1);
    expect(outbox.notices).toEqual([
      {
        id: pending.id,
        userId: 'u-1',
        kind: 'sent',
        roomName: 'Salle Atlas',
        startAt: body.startAt,
        endAt: body.endAt,
      },
    ]);

    dismissNotice(pending.id);
    expect(outbox.notices).toEqual([]);
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull();
  });

  it('une demande retirée par l’utilisateur ne laisse pas de message', () => {
    const pending = queueReservation('u-1', 'Salle Atlas', body);
    settlePending(pending.id);

    expect(outbox.items).toEqual([]);
    expect(outbox.notices).toEqual([]);
    expect(outbox.sent).toBe(0);
  });

  it('relit le stockage à chaque modification (autre onglet) et ignore les entrées illisibles', () => {
    const mine = queueReservation('u-1', 'Salle Atlas', body);
    // Un autre onglet ajoute une demande, plus une valeur abîmée
    const other = { ...mine, id: 'autre-onglet' };
    localStorage.setItem(
      OUTBOX_KEY,
      JSON.stringify({ items: [mine, other, { id: 3 }], notices: ['abîmé'] }),
    );

    settlePending(mine.id);
    expect(outbox.items).toEqual([other]);
    expect(outbox.notices).toEqual([]);
  });

  it('keepOutboxOf retire les demandes et messages des autres comptes', () => {
    const mine = queueReservation('u-1', 'Salle Atlas', body);
    const other = queueReservation('u-2', 'Salle Borée', body);
    settlePending(other.id, { kind: 'sent' });
    queueReservation('u-2', 'Salle Cirrus', body);

    keepOutboxOf('u-1');

    expect(outbox.items).toEqual([mine]);
    expect(outbox.notices).toEqual([]);
  });

  it('isQueued relit le stockage', () => {
    const pending = queueReservation('u-1', 'Salle Atlas', body);
    expect(isQueued(pending.id)).toBe(true);
    localStorage.removeItem(OUTBOX_KEY);
    expect(isQueued(pending.id)).toBe(false);
  });

  it('clearOutbox vide la file et le stockage', () => {
    queueReservation('u-1', 'Salle Atlas', body);
    clearOutbox();
    expect(outbox.items).toEqual([]);
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull();
  });
});
