import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../../domain/entities/payment.entity';
import {
  Reservation,
  ReservationStatus,
  type ReservationActor,
} from '../../domain/entities/reservation.entity';
import {
  ReservationAccessDeniedException,
  ReservationConflictException,
} from '../../domain/exceptions/reservation-domain.exception';
import type { PaymentRepositoryInterface } from '../../domain/repositories/payment.repository.interface';
import type { ReservationRepositoryInterface } from '../../domain/repositories/reservation.repository.interface';
import type { PaymentGatewayPort } from '../ports/payment-gateway.port';
import { CreatePaymentUseCase } from './create-payment.use-case';

const author: ReservationActor = {
  id: 'user-1',
  isAdmin: false,
  isManager: false,
};

const reservation = new Reservation({
  id: 'r1',
  roomId: 'room-1',
  userId: author.id,
  startAt: new Date('2026-12-01T09:00:00Z'),
  endAt: new Date('2026-12-01T10:00:00Z'),
  status: ReservationStatus.CONFIRMED,
  numberOfParticipants: null,
  comment: null,
  totalAmount: 45,
  currency: 'EUR',
  rejectionReason: null,
});

/** Dépôt de paiements en mémoire : une réservation a au plus un paiement (contrainte d'unicité). */
class InMemoryPayments implements PaymentRepositoryInterface {
  readonly rows = new Map<string, Payment>();

  findById(id: string) {
    return Promise.resolve(
      [...this.rows.values()].find((p) => p.id === id) ?? null,
    );
  }

  save(payment: Payment) {
    const existing = this.rows.get(payment.reservationId);
    if (existing && existing.id !== payment.id) {
      return Promise.reject(
        new ReservationConflictException('La réservation a déjà un paiement'),
      );
    }
    const saved = new Payment({ ...payment, id: payment.id ?? 'p1' });
    this.rows.set(payment.reservationId, saved);
    return Promise.resolve(new Payment({ ...saved }));
  }

  retryFailed(reservationId: string, method: PaymentMethod) {
    const existing = this.rows.get(reservationId);
    if (existing?.status !== PaymentStatus.FAILED) return Promise.resolve(null);
    const retried = new Payment({
      ...existing,
      status: PaymentStatus.PENDING,
      paymentMethod: method,
      externalTransactionId: null,
      paymentUrl: null,
    });
    this.rows.set(reservationId, retried);
    return Promise.resolve(new Payment({ ...retried }));
  }
}

const setup = (charge: PaymentGatewayPort['charge']) => {
  const payments = new InMemoryPayments();
  const reservations = {
    findById: () => Promise.resolve(reservation),
  } as unknown as ReservationRepositoryInterface;
  const gateway: PaymentGatewayPort = { charge: vi.fn(charge) };
  return {
    payments,
    gateway,
    useCase: new CreatePaymentUseCase(reservations, payments, gateway),
  };
};

const paid = () =>
  Promise.resolve({
    status: PaymentStatus.PAID,
    externalTransactionId: 'tx-1',
    paymentUrl: null,
  });

describe('CreatePaymentUseCase', () => {
  it('enregistre le paiement avec le résultat du prestataire', async () => {
    const { useCase, payments } = setup(paid);
    const payment = await useCase.execute('r1', PaymentMethod.CARD, author);
    expect(payment.status).toBe(PaymentStatus.PAID);
    expect(payment.externalTransactionId).toBe('tx-1');
    expect(payments.rows.get('r1')?.status).toBe(PaymentStatus.PAID);
  });

  it('refuse un second paiement sans débiter le prestataire', async () => {
    const { useCase, gateway } = setup(paid);
    await useCase.execute('r1', PaymentMethod.CARD, author);
    await expect(
      useCase.execute('r1', PaymentMethod.CARD, author),
    ).rejects.toThrow(ReservationConflictException);
    expect(gateway.charge).toHaveBeenCalledTimes(1);
  });

  it('refuse un utilisateur qui n’est pas l’auteur', async () => {
    const { useCase, gateway } = setup(paid);
    await expect(
      useCase.execute('r1', PaymentMethod.CARD, { ...author, id: 'autre' }),
    ).rejects.toThrow(ReservationAccessDeniedException);
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it('passe le paiement à FAILED si le prestataire est en erreur, puis le reprend', async () => {
    const { useCase, payments, gateway } = setup(() =>
      Promise.reject(new Error('Prestataire injoignable')),
    );
    await expect(
      useCase.execute('r1', PaymentMethod.CARD, author),
    ).rejects.toThrow('Prestataire injoignable');
    expect(payments.rows.get('r1')?.status).toBe(PaymentStatus.FAILED);

    vi.mocked(gateway.charge).mockImplementation(paid);
    const retried = await useCase.execute('r1', PaymentMethod.PAYPAL, author);
    expect(retried.status).toBe(PaymentStatus.PAID);
    expect(retried.paymentMethod).toBe(PaymentMethod.PAYPAL);
  });

  it('reprend un paiement refusé par le prestataire (FAILED)', async () => {
    const { useCase, gateway } = setup(() =>
      Promise.resolve({
        status: PaymentStatus.FAILED,
        externalTransactionId: 'tx-0',
        paymentUrl: null,
      }),
    );
    expect(
      (await useCase.execute('r1', PaymentMethod.CARD, author)).status,
    ).toBe(PaymentStatus.FAILED);

    vi.mocked(gateway.charge).mockImplementation(paid);
    expect(
      (await useCase.execute('r1', PaymentMethod.CARD, author)).status,
    ).toBe(PaymentStatus.PAID);
  });
});
