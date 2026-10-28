import {
  Catch,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  InvalidRoomException,
  RoomAccessDeniedException,
  RoomDomainException,
  RoomHasReservationsException,
  RoomNotFoundException,
} from '../../domain/exceptions/room-domain.exception.js';

// Exception du domaine → statut HTTP et code du schéma Error du contrat
function toHttp(exception: RoomDomainException): [HttpStatus, string] {
  if (exception instanceof RoomNotFoundException) {
    return [HttpStatus.NOT_FOUND, 'NOT_FOUND'];
  }
  if (exception instanceof RoomAccessDeniedException) {
    return [HttpStatus.FORBIDDEN, 'FORBIDDEN'];
  }
  if (exception instanceof RoomHasReservationsException) {
    return [HttpStatus.CONFLICT, 'CONFLICT'];
  }
  if (exception instanceof InvalidRoomException) {
    return [HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR'];
  }
  return [HttpStatus.BAD_REQUEST, 'BAD_REQUEST'];
}

// Même format que ApiExceptionFilter (common/api-errors.ts) : { code, message }
@Catch(RoomDomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: RoomDomainException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const [status, code] = toHttp(exception);
    response.status(status).json({ code, message: exception.message });
  }
}
