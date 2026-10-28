import type {
  PaymentMethod,
  PaymentStatus,
} from '../../domain/entities/payment.entity.js';

// Prestataire de paiement externe
export interface PaymentGatewayPort {
  charge(request: {
    amount: number;
    currency: string;
    method: PaymentMethod;
  }): Promise<{
    status: PaymentStatus;
    externalTransactionId: string;
    paymentUrl: string | null;
  }>;
}

export const PAYMENT_GATEWAY = 'PaymentGatewayPort';
