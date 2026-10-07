import type { Room } from '@room-booking/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRoomsCache, getRoomsByIds } from './roomNames';
import { getRoom } from './rooms.queries';

vi.mock('./rooms.queries', () => ({ getRoom: vi.fn() }));

function room(id: string): Room {
  return {
    id,
    name: `Salle ${id}`,
    capacity: 4,
    location: 'Paris',
    pricePerHour: 10,
    status: 'ACTIVE',
  };
}

const notFound = { status: 404, code: 'NOT_FOUND', message: 'x' };

beforeEach(() => {
  clearRoomsCache();
  vi.mocked(getRoom).mockReset();
  vi.mocked(getRoom).mockImplementation((id) => Promise.resolve({ ok: true, data: room(id) }));
});

describe('getRoomsByIds', () => {
  it('fait un seul appel par identifiant distinct', async () => {
    const rooms = await getRoomsByIds(['a', 'b', 'a', 'a']);
    expect(getRoom).toHaveBeenCalledTimes(2);
    expect([...rooms.keys()]).toEqual(['a', 'b']);
    expect(rooms.get('a')?.name).toBe('Salle a');
  });

  it('garde les salles en cache entre deux appels', async () => {
    await getRoomsByIds(['a', 'b']);
    await getRoomsByIds(['b', 'c']);
    expect(vi.mocked(getRoom).mock.calls.map(([id]) => id)).toEqual(['a', 'b', 'c']);
  });

  it('ne fait qu’une requête pour deux appels simultanés', async () => {
    await Promise.all([getRoomsByIds(['a']), getRoomsByIds(['a'])]);
    expect(getRoom).toHaveBeenCalledTimes(1);
  });

  it('omet les identifiants en erreur et les retente ensuite', async () => {
    vi.mocked(getRoom).mockImplementation((id) =>
      Promise.resolve(id === 'x' ? { ok: false, error: notFound } : { ok: true, data: room(id) }),
    );
    const rooms = await getRoomsByIds(['a', 'x']);
    expect(rooms.has('a')).toBe(true);
    expect(rooms.has('x')).toBe(false);

    await getRoomsByIds(['a', 'x']);
    expect(vi.mocked(getRoom).mock.calls.map(([id]) => id)).toEqual(['a', 'x', 'x']);
  });

  it('renvoie une Map vide sans identifiant', async () => {
    expect((await getRoomsByIds([])).size).toBe(0);
    expect(getRoom).not.toHaveBeenCalled();
  });
});
