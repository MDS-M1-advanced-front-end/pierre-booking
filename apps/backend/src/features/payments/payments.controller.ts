import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CreatePaymentDTO, PaymentDTO } from './payments.dto.js';

@Controller('payments')
export class PaymentsController {
  @Post()
  create(@Body() body: CreatePaymentDTO): PaymentDTO {
    throw new NotImplementedException();
  }

  @Get(':paymentId')
  findOne(@Param('paymentId', ParseUUIDPipe) paymentId: string): PaymentDTO {
    throw new NotImplementedException();
  }
}
