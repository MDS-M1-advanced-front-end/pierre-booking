import {
  Catch,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  InvalidReservationException,
  ReservationAccessDeniedException,
  ReservationConflictException,
  ReservationDomainException,
  ReservationNotFoundException,
} from '../../domain/exceptions/reservation-domain.exception.js';

// Exception du domaine → statut HTTP et code du schéma Error du contrat
function toHttp(exception: ReservationDomainException): [HttpStatus, string] {
  if (exception instanceof ReservationNotFoundException) {
    return [HttpStatus.NOT_FOUND, 'NOT_FOUND'];
  }
  if (exception instanceof ReservationAccessDeniedException) {
    return [HttpStatus.FORBIDDEN, 'FORBIDDEN'];
  }
  if (exception instanceof ReservationConflictException) {
    return [HttpStatus.CONFLICT, 'CONFLICT'];
  }
  if (exception instanceof InvalidReservationException) {
    return [HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR'];
  }
  return [HttpStatus.BAD_REQUEST, 'BAD_REQUEST'];
}

// Même format que ApiExceptionFilter (common/api-errors.ts) : { code, message }
@Catch(ReservationDomainException)
export class ReservationExceptionFilter implements ExceptionFilter {
  catch(exception: ReservationDomainException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const [status, code] = toHttp(exception);
    response.status(status).json({ code, message: exception.message });
  }
}
