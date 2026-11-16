import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseFilters,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../../../users/infrastructure/auth/auth.decorators';
import { CreatePaymentUseCase } from '../../application/use-cases/create-payment.use-case';
import { GetPaymentUseCase } from '../../application/use-cases/get-payment.use-case';
import { toPaymentDTO } from '../dtos/reservation-dto.mapper';
import { CreatePaymentDTO, PaymentDTO } from '../dtos/payments.dto';
import { ReservationExceptionFilter } from '../filters/reservation-exception.filter';
import { toActor } from './actor';

/** Routes `/payments` : paiement d'une réservation (prestataire simulé). */
@Controller('payments')
@UseFilters(ReservationExceptionFilter)
export class PaymentsController {
  constructor(
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly getPaymentUseCase: GetPaymentUseCase,
  ) {}

  /**
   * POST /payments : réservé à l'auteur de la réservation.
   * @param dto - Réservation à payer et moyen de paiement.
   * @param user - Utilisateur connecté.
   * @returns Le paiement enregistré.
   */
  @Post()
  async create(
    @Body() dto: CreatePaymentDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<PaymentDTO> {
    return toPaymentDTO(
      await this.createPaymentUseCase.execute(
        dto.reservationId,
        dto.paymentMethod,
        toActor(user),
      ),
    );
  }

  /**
   * GET /payments/{paymentId} : auteur de la réservation ou administrateur.
   * @param paymentId - UUID du paiement.
   * @param user - Utilisateur connecté.
   * @returns Le paiement.
   */
  @Get(':paymentId')
  async findOne(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<PaymentDTO> {
    return toPaymentDTO(
      await this.getPaymentUseCase.execute(paymentId, toActor(user)),
    );
  }
}
