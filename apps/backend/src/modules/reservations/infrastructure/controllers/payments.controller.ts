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
} from '../../../users/infrastructure/auth/auth.decorators.js';
import { CreatePaymentUseCase } from '../../application/use-cases/create-payment.use-case.js';
import { GetPaymentUseCase } from '../../application/use-cases/get-payment.use-case.js';
import { toPaymentDTO } from '../dtos/reservation-dto.mapper.js';
import { CreatePaymentDTO, PaymentDTO } from '../dtos/payments.dto.js';
import { ReservationExceptionFilter } from '../filters/reservation-exception.filter.js';
import { toActor } from './actor.js';

@Controller('payments')
@UseFilters(ReservationExceptionFilter)
export class PaymentsController {
  constructor(
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly getPaymentUseCase: GetPaymentUseCase,
  ) {}

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
