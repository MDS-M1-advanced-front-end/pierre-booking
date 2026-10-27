import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { CreatePaymentDTO, PaymentDTO } from './payments.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(
    @Body() body: CreatePaymentDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<PaymentDTO> {
    return this.paymentsService.create(body, user);
  }

  @Get(':paymentId')
  findOne(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<PaymentDTO> {
    return this.paymentsService.findOne(paymentId, user);
  }
}
