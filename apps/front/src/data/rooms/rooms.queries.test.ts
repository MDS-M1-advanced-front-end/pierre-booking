import type { Room } from '@room-booking/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchRooms } from '../client';
import { listLocations, listRoomsOfOwner } from './rooms.queries';

vi.mock('../client', () => ({ searchRooms: vi.fn() }));
vi.mock('../auth/session.svelte', () => ({ expireSession: vi.fn() }));

const OWNER_A = 'owner-a';
const OWNER_B = 'owner-b';

function room(id: string, ownerId: string, location: string): Room {
  return { id, ownerId, location, name: id, capacity: 4, pricePerHour: 10, status: 'ACTIVE' };
}

const allRooms = [
  room('1', OWNER_A, 'Paris 11e'),
  room('2', OWNER_B, 'Lyon Part-Dieu'),
  room('3', OWNER_A, 'Évry'),
  room('4', OWNER_B, 'Paris 11e'),
  room('5', OWNER_A, 'Bordeaux Chartrons'),
];

/** Simule une API paginée par pages de 2 salles. */
function paginate(rooms: Room[], size = 2) {
  vi.mocked(searchRooms).mockImplementation((query = {}) => {
    const page = query.page ?? 1;
    const items = rooms.slice((page - 1) * size, page * size);
    return Promise.resolve({
      ok: true,
      data: { items, page, pageSize: size, total: rooms.length },
    });
  });
}

beforeEach(() => {
  vi.mocked(searchRooms).mockReset();
});

describe('listRoomsOfOwner', () => {
  it('parcourt toutes les pages et filtre par propriétaire', async () => {
    paginate(allRooms);
    const result = await listRoomsOfOwner(OWNER_A);
    expect(result).toEqual({ ok: true, data: [allRooms[0], allRooms[2], allRooms[4]] });
    expect(searchRooms).toHaveBeenCalledTimes(3);
  });

  it("s'arrête si l'API ignore le numéro de page (mock Prism)", async () => {
    vi.mocked(searchRooms).mockResolvedValue({
      ok: true,
      data: { items: allRooms.slice(0, 2), page: 1, pageSize: 20, total: 5 },
    });
    const result = await listRoomsOfOwner(OWNER_B);
    expect(result).toEqual({ ok: true, data: [allRooms[1]] });
    expect(searchRooms).toHaveBeenCalledTimes(2);
  });

  it("renvoie l'erreur d'une page", async () => {
    const error = { status: 0, code: 'NETWORK_ERROR', message: 'x' };
    paginate(allRooms);
    vi.mocked(searchRooms).mockResolvedValueOnce({
      ok: true,
      data: { items: allRooms.slice(0, 2), page: 1, pageSize: 2, total: 5 },
    });
    vi.mocked(searchRooms).mockResolvedValueOnce({ ok: false, error });
    expect(await listRoomsOfOwner(OWNER_A)).toEqual({ ok: false, error });
  });
});

describe('listLocations', () => {
  it('renvoie les lieux distincts de toutes les pages, triés en français', async () => {
    paginate(allRooms);
    const result = await listLocations();
    expect(result).toEqual({
      ok: true,
      data: ['Bordeaux Chartrons', 'Évry', 'Lyon Part-Dieu', 'Paris 11e'],
    });
  });

  it('gère une liste vide', async () => {
    paginate([]);
    expect(await listLocations()).toEqual({ ok: true, data: [] });
    expect(searchRooms).toHaveBeenCalledOnce();
  });
});
