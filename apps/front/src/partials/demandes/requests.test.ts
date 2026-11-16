import type { Reservation, ReservationStatus } from '@room-booking/core';
import type { ReservationRequestFieldsFragment } from '@room-booking/core/graphql';
import { describe, expect, it } from 'vitest';
import { HANDLED_LIMIT, markHandled, toRequestLists } from './requests';

const reservation = (
  id: string,
  status: ReservationStatus,
  startAt: string,
  roomId = 'room-1',
): Reservation => ({
  id,
  roomId,
  userId: 'user-1',
  startAt,
  endAt: startAt.replace('T09', 'T10'),
  status,
  totalAmount: 45,
});

describe('toRequestLists', () => {
  const request = (
    id: string,
    status: ReservationStatus,
    room: { id: string; name: string },
    requester: { id: string; firstName: string; lastName: string },
  ): ReservationRequestFieldsFragment => ({
    id,
    room,
    requester,
    startAt: '2026-10-20T14:00:00.000Z',
    endAt: '2026-10-20T18:00:00.000Z',
    status,
    numberOfParticipants: null,
    comment: null,
    totalAmount: 1000,
    currency: 'EUR',
  });
  const bastille = { id: 'room-1', name: 'Auditorium Bastille' };
  const voltaire = { id: 'room-2', name: 'Salle Voltaire' };
  const lea = { id: 'user-1', firstName: 'Léa', lastName: 'Martin' };
  const hugo = { id: 'user-2', firstName: 'Hugo', lastName: 'Bernard' };

  const lists = toRequestLists({
    reservationRequests: {
      pending: [{ ...request('a', 'PENDING', bastille, lea), comment: 'Conférence' }],
      handled: [request('b', 'CONFIRMED', voltaire, hugo), request('c', 'REJECTED', bastille, lea)],
    },
  });

  it('garde l’ordre du back et ramène chaque demande au type Reservation du REST', () => {
    expect(lists.pending).toEqual([
      {
        id: 'a',
        roomId: 'room-1',
        userId: 'user-1',
        startAt: '2026-10-20T14:00:00.000Z',
        endAt: '2026-10-20T18:00:00.000Z',
        status: 'PENDING',
        numberOfParticipants: undefined,
        comment: 'Conférence',
        totalAmount: 1000,
        currency: 'EUR',
      },
    ]);
    expect(lists.handled.map((r) => [r.id, r.status])).toEqual([
      ['b', 'CONFIRMED'],
      ['c', 'REJECTED'],
    ]);
  });

  it('indexe les noms des salles et des demandeurs', () => {
    expect([...lists.roomNames]).toEqual([
      ['room-1', 'Auditorium Bastille'],
      ['room-2', 'Salle Voltaire'],
    ]);
    expect(lists.requesterNames.get('user-2')).toBe('Hugo Bernard');
  });
});

describe('markHandled', () => {
  it('retire la demande des attentes et la place en tête des traitées', () => {
    const pending = [reservation('b', 'PENDING', '2026-10-20T09:00:00Z')];
    const handled = [reservation('a', 'CONFIRMED', '2026-10-12T09:00:00Z')];
    const next = markHandled({ pending, handled }, pending[0], 'REJECTED');
    expect(next.pending).toEqual([]);
    expect(next.handled.map((r) => [r.id, r.status])).toEqual([
      ['b', 'REJECTED'],
      ['a', 'CONFIRMED'],
    ]);
  });

  it(`garde au plus ${HANDLED_LIMIT} demandes traitées`, () => {
    const handled = Array.from({ length: HANDLED_LIMIT }, (_, i) =>
      reservation(`r${i}`, 'CONFIRMED', '2026-10-12T09:00:00Z'),
    );
    const pending = [reservation('b', 'PENDING', '2026-10-20T09:00:00Z')];
    const next = markHandled({ pending, handled }, pending[0], 'CONFIRMED');
    expect(next.handled).toHaveLength(HANDLED_LIMIT);
    expect(next.handled[0]?.id).toBe('b');
  });
});
