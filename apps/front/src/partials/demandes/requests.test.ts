import type { Reservation, ReservationStatus } from '@room-booking/core';
import { describe, expect, it } from 'vitest';
import { HANDLED_LIMIT, markHandled, splitRequests } from './requests';

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

describe('splitRequests', () => {
  const list = [
    reservation('a', 'CONFIRMED', '2026-10-12T09:00:00Z'),
    reservation('b', 'PENDING', '2026-10-20T09:00:00Z'),
    reservation('c', 'PENDING', '2026-10-15T09:00:00Z'),
    reservation('d', 'CANCELLED', '2026-10-16T09:00:00Z'),
    reservation('e', 'REJECTED', '2026-10-14T09:00:00Z'),
    reservation('f', 'COMPLETED', '2026-09-14T09:00:00Z'),
    reservation('g', 'PENDING', '2026-10-01T09:00:00Z', 'room-autre'),
  ];

  it('sépare les demandes en attente (la plus proche d’abord) et traitées (la plus récente d’abord)', () => {
    const { pending, handled } = splitRequests(list, new Set(['room-1']));
    expect(pending.map((r) => r.id)).toEqual(['c', 'b']);
    expect(handled.map((r) => r.id)).toEqual(['e', 'a', 'f']);
  });

  it('ne filtre pas les salles quand elles sont inconnues', () => {
    expect(splitRequests(list).pending.map((r) => r.id)).toEqual(['g', 'c', 'b']);
  });

  it(`limite les demandes traitées à ${HANDLED_LIMIT}`, () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      reservation(`r${i}`, 'CONFIRMED', `2026-10-${String(i + 1).padStart(2, '0')}T09:00:00Z`),
    );
    const { handled } = splitRequests(many);
    expect(handled).toHaveLength(HANDLED_LIMIT);
    expect(handled[0]?.id).toBe('r14');
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
});
