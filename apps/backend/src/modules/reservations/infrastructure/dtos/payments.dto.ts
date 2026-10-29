import type { Payment, PaymentCreateRequest } from '@room-booking/core';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../domain/entities/payment.entity';

/** Paiement renvoyé par l'API (schéma Payment du contrat). */
export class PaymentDTO implements Payment {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsUUID()
  @IsNotEmpty()
  reservationId: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsEnum(PaymentStatus)
  @IsNotEmpty()
  status: PaymentStatus;

  @IsUrl()
  @IsOptional()
  paymentUrl?: string;

  @IsISO8601()
  @IsOptional()
  createdAt?: string;
}

/** POST /payments. */
export class CreatePaymentDTO implements PaymentCreateRequest {
  @IsUUID()
  @IsNotEmpty()
  reservationId: string;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;
}
