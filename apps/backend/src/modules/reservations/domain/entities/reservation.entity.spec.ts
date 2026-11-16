import { InvalidStateTransitionException } from '../exceptions/reservation-domain.exception';
import { Reservation, ReservationStatus } from './reservation.entity';

const reservation = (status: ReservationStatus) =>
  new Reservation({
    id: 'r1',
    roomId: 'room-1',
    userId: 'user-1',
    startAt: new Date('2026-12-01T09:00:00Z'),
    endAt: new Date('2026-12-01T10:00:00Z'),
    status,
    numberOfParticipants: null,
    comment: null,
    totalAmount: 45,
    currency: 'EUR',
    rejectionReason: null,
  });

const { PENDING, CONFIRMED, REJECTED, CANCELLED, COMPLETED } =
  ReservationStatus;
const TERMINAL = [REJECTED, CANCELLED, COMPLETED];

describe('Reservation : machine à états', () => {
  it('confirme ou refuse une demande en attente', () => {
    const confirmed = reservation(PENDING);
    confirmed.confirm();
    expect(confirmed.status).toBe(CONFIRMED);

    const rejected = reservation(PENDING);
    rejected.reject('Salle en travaux');
    expect(rejected.status).toBe(REJECTED);
    expect(rejected.rejectionReason).toBe('Salle en travaux');
  });

  it.each([CONFIRMED, ...TERMINAL])(
    'refuse de confirmer ou de refuser une réservation %s',
    (status) => {
      expect(() => reservation(status).confirm()).toThrow(
        InvalidStateTransitionException,
      );
      expect(() => reservation(status).reject()).toThrow(
        InvalidStateTransitionException,
      );
    },
  );

  it.each([PENDING, CONFIRMED])('annule une réservation %s', (status) => {
    const r = reservation(status);
    r.cancel();
    expect(r.status).toBe(CANCELLED);
  });

  it.each([PENDING, CONFIRMED])(
    'repasse une réservation %s en attente quand elle est déplacée',
    (status) => {
      const r = reservation(status);
      const startAt = new Date('2026-12-02T09:00:00Z');
      const endAt = new Date('2026-12-02T11:00:00Z');
      r.reschedule(startAt, endAt, 90);
      expect(r.status).toBe(PENDING);
      expect([r.startAt, r.endAt, r.totalAmount]).toEqual([startAt, endAt, 90]);
    },
  );

  it.each(TERMINAL)('un statut %s est terminal', (status) => {
    const r = reservation(status);
    expect(() => r.cancel()).toThrow(InvalidStateTransitionException);
    expect(() => r.reschedule(r.startAt, r.endAt, 45)).toThrow(
      InvalidStateTransitionException,
    );
    expect(r.status).toBe(status);
  });
});
