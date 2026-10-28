import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PaymentGatewayPort } from '../../application/ports/payment-gateway.port.js';
import { PaymentStatus } from '../../domain/entities/payment.entity.js';

/** Système de paiement externe simulé : le paiement est accepté immédiatement. */
@Injectable()
export class MockPaymentGateway implements PaymentGatewayPort {
  /**
   * Accepte tout paiement, avec une référence de transaction fictive (`mock_<uuid>`).
   * @returns Un paiement PAID, sans URL de paiement.
   */
  charge(): ReturnType<PaymentGatewayPort['charge']> {
    return Promise.resolve({
      status: PaymentStatus.PAID,
      externalTransactionId: `mock_${randomUUID()}`,
      paymentUrl: null,
    });
  }
}
