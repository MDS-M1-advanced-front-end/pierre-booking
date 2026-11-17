import type {
  PaginatedReservations,
  Reservation,
  ReservationCreateRequest,
  Result,
} from '@room-booking/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearOutbox, outbox, queueReservation } from '../offline/outbox.svelte';

const { createReservation, listMyReservations, restoreSession } = vi.hoisted(() => ({
  createReservation: vi.fn<(body: ReservationCreateRequest) => Promise<Result<Reservation>>>(),
  listMyReservations: vi.fn<() => Promise<Result<PaginatedReservations>>>(),
  restoreSession: vi.fn(),
}));

vi.mock('./reservations.queries', () => ({ createReservation, listMyReservations }));
vi.mock('../auth/session.svelte', () => ({
  restoreSession,
  ensureFreshSession: vi.fn(),
  expireSession: vi.fn(),
  refreshSession: vi.fn(),
}));

const { sendPendingReservations } = await import('./pendingReservations');

const body: ReservationCreateRequest = {
  roomId: 'r-1',
  startAt: '2026-11-20T09:00:00Z',
  endAt: '2026-11-20T11:00:00Z',
  numberOfParticipants: 4,
};

const created = (overrides: Partial<Reservation> = {}): Reservation => ({
  id: 'res-1',
  roomId: body.roomId,
  userId: 'u-1',
  startAt: '2026-11-20T09:00:00.000Z',
  endAt: '2026-11-20T11:00:00.000Z',
  status: 'PENDING',
  totalAmount: 50,
  ...overrides,
});

const fail = (status: number): Result<never> => ({
  ok: false,
  error: { status, code: 'ERR', message: 'erreur' },
});

const page = (items: Reservation[]): Result<PaginatedReservations> => ({
  ok: true,
  data: { items, total: items.length, page: 1, pageSize: 100 },
});

beforeEach(() => {
  clearOutbox();
  outbox.sent = 0;
  restoreSession.mockReturnValue({ id: 'u-1' });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe('sendPendingReservations', () => {
  it('envoie les demandes du compte connecté, dans l’ordre, et laisse celles des autres', async () => {
    const first = queueReservation('u-1', 'Salle Atlas', body);
    const other = queueReservation('u-2', 'Salle Borée', body);
    const second = queueReservation('u-1', 'Salle Cirrus', { ...body, roomId: 'r-2' });
    createReservation.mockResolvedValue({ ok: true, data: created() });

    await sendPendingReservations();

    expect(createReservation.mock.calls.map(([sent]) => sent.roomId)).toEqual(['r-1', 'r-2']);
    expect(outbox.items).toEqual([other]);
    expect(outbox.notices.map((notice) => [notice.id, notice.kind])).toEqual([
      [first.id, 'sent'],
      [second.id, 'sent'],
    ]);
  });

  it('ne fait rien hors ligne ni sans session', async () => {
    queueReservation('u-1', 'Salle Atlas', body);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await sendPendingReservations();

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    restoreSession.mockReturnValue(null);
    await sendPendingReservations();

    expect(createReservation).not.toHaveBeenCalled();
    expect(outbox.items).toHaveLength(1);
  });

  it.each([0, 401, 503])('garde la demande et s’arrête sur une erreur %i', async (status) => {
    queueReservation('u-1', 'Salle Atlas', body);
    queueReservation('u-1', 'Salle Borée', body);
    createReservation.mockResolvedValue(fail(status));

    await sendPendingReservations();

    expect(createReservation).toHaveBeenCalledTimes(1);
    expect(outbox.items).toHaveLength(2);
    expect(outbox.notices).toEqual([]);
  });

  it('409 et créneau pris par quelqu’un d’autre : demande refusée, avec le motif', async () => {
    queueReservation('u-1', 'Salle Atlas', body);
    createReservation.mockResolvedValue(fail(409));
    listMyReservations.mockResolvedValue(page([created({ status: 'CANCELLED' })]));

    await sendPendingReservations();

    expect(outbox.items).toEqual([]);
    expect(outbox.notices[0]).toMatchObject({
      kind: 'rejected',
      reason: expect.stringContaining("n'est plus libre") as string,
    });
    expect(outbox.sent).toBe(0);
  });

  it('409 parce que la demande était déjà arrivée (réponse perdue) : comptée comme envoyée', async () => {
    queueReservation('u-1', 'Salle Atlas', body);
    createReservation.mockResolvedValue(fail(409));
    listMyReservations.mockResolvedValue(page([created()]));

    await sendPendingReservations();

    expect(outbox.items).toEqual([]);
    expect(outbox.notices[0]?.kind).toBe('sent');
    expect(outbox.sent).toBe(1);
  });

  it('409 sans pouvoir vérifier (réseau) : la demande reste en file', async () => {
    queueReservation('u-1', 'Salle Atlas', body);
    createReservation.mockResolvedValue(fail(409));
    listMyReservations.mockResolvedValue(fail(0));

    await sendPendingReservations();

    expect(outbox.items).toHaveLength(1);
    expect(outbox.notices).toEqual([]);
  });

  it('autre refus (400) : demande retirée, avec le message de l’erreur', async () => {
    queueReservation('u-1', 'Salle Atlas', body);
    createReservation.mockResolvedValue(fail(400));

    await sendPendingReservations();

    expect(outbox.items).toEqual([]);
    expect(outbox.notices[0]).toMatchObject({
      kind: 'rejected',
      reason: 'Certaines informations sont invalides.',
    });
  });

  it('les appels simultanés partagent un seul envoi', async () => {
    queueReservation('u-1', 'Salle Atlas', body);
    createReservation.mockResolvedValue({ ok: true, data: created() });

    await Promise.all([sendPendingReservations(), sendPendingReservations()]);

    expect(createReservation).toHaveBeenCalledTimes(1);
  });
});
