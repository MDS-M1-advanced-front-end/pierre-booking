export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CARD = 'CARD',
  PAYPAL = 'PAYPAL',
}

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
