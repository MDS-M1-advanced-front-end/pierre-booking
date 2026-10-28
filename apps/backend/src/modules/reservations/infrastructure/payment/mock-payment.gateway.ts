import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PaymentGatewayPort } from '../../application/ports/payment-gateway.port.js';
import { PaymentStatus } from '../../domain/entities/payment.entity.js';

// Système de paiement externe simulé : le paiement est accepté immédiatement
@Injectable()
export class MockPaymentGateway implements PaymentGatewayPort {
  charge(): ReturnType<PaymentGatewayPort['charge']> {
    return Promise.resolve({
      status: PaymentStatus.PAID,
      externalTransactionId: `mock_${randomUUID()}`,
      paymentUrl: null,
    });
  }
}
