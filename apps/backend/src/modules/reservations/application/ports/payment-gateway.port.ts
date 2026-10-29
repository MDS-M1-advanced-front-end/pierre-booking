import type {
  PaymentMethod,
  PaymentStatus,
} from '../../domain/entities/payment.entity';

/** Prestataire de paiement externe (simulé par `MockPaymentGateway`). */
export interface PaymentGatewayPort {
  /**
   * Débite le montant d'une réservation.
   * @param request - Montant, devise et moyen de paiement.
   * @returns Le statut du paiement, la référence de la transaction chez le prestataire et, le cas
   *   échéant, l'URL de paiement à présenter au client.
   */
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

/** Jeton d'injection de `PaymentGatewayPort`. */
export const PAYMENT_GATEWAY = 'PaymentGatewayPort';
