/** État d'un paiement auprès du prestataire. */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

/** Moyen de paiement choisi par le client (`POST /payments`). */
export enum PaymentMethod {
  CARD = 'CARD',
  PAYPAL = 'PAYPAL',
}

/** Données d'un paiement ; `id` et `createdAt` sont absents tant qu'il n'est pas enregistré. */
export interface PaymentProps {
  id?: string;
  reservationId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  externalTransactionId: string | null;
  paymentUrl: string | null;
  createdAt?: Date;
}

/** Paiement d'une réservation : une réservation a au plus un paiement (MCD 0,1). */
export class Payment {
  readonly id?: string;
  readonly reservationId: string;
  readonly amount: number;
  readonly currency: string;
  readonly paymentMethod: PaymentMethod;
  status: PaymentStatus;
  externalTransactionId: string | null;
  paymentUrl: string | null;
  readonly createdAt?: Date;

  /**
   * @param props - Données du paiement, telles que lues en base ou à créer.
   */
  constructor(props: PaymentProps) {
    this.id = props.id;
    this.reservationId = props.reservationId;
    this.amount = props.amount;
    this.currency = props.currency;
    this.paymentMethod = props.paymentMethod;
    this.status = props.status;
    this.externalTransactionId = props.externalTransactionId;
    this.paymentUrl = props.paymentUrl;
    this.createdAt = props.createdAt;
  }
}
