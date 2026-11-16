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
} from '../../domain/exceptions/room-domain.exception';

/**
 * Exception du domaine → statut HTTP et code du schéma Error du contrat.
 * @param exception - Exception levée par le domaine ou un cas d'usage.
 * @returns Le statut HTTP et le code d'erreur.
 */
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

/**
 * Traduit les exceptions du domaine des salles en réponses HTTP, au même format que
 * ApiExceptionFilter (common/api-errors.ts) : { code, message }.
 */
@Catch(RoomDomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  /**
   * Écrit la réponse d'erreur.
   * @param exception - Exception du domaine.
   * @param host - Contexte de la requête.
   */
  catch(exception: RoomDomainException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const [status, code] = toHttp(exception);
    response.status(status).json({ code, message: exception.message });
  }
}
