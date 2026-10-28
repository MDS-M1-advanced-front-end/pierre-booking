import {
  Catch,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  EmailAlreadyUsedException,
  InvalidCredentialsException,
  UserDomainException,
  UserHasReservationsException,
  UserNotFoundException,
  WrongCurrentPasswordException,
} from '../../domain/exceptions/user-domain.exception.js';

/**
 * Exception du domaine → statut HTTP et code du schéma Error du contrat.
 * @param exception - Exception levée par un cas d'usage.
 * @returns Le statut HTTP et le code d'erreur.
 */
function toHttp(exception: UserDomainException): [HttpStatus, string] {
  if (exception instanceof UserNotFoundException) {
    return [HttpStatus.NOT_FOUND, 'NOT_FOUND'];
  }
  if (exception instanceof InvalidCredentialsException) {
    return [HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED'];
  }
  if (
    exception instanceof EmailAlreadyUsedException ||
    exception instanceof UserHasReservationsException
  ) {
    return [HttpStatus.CONFLICT, 'CONFLICT'];
  }
  if (exception instanceof WrongCurrentPasswordException) {
    return [HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR'];
  }
  return [HttpStatus.BAD_REQUEST, 'BAD_REQUEST'];
}

/**
 * Traduit les exceptions du domaine users en réponses HTTP.
 * Même format que ApiExceptionFilter (common/api-errors.ts) : { code, message }.
 */
@Catch(UserDomainException)
export class UserExceptionFilter implements ExceptionFilter {
  /**
   * @param exception - Exception du domaine.
   * @param host - Contexte de la requête, pour écrire la réponse.
   */
  catch(exception: UserDomainException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const [status, code] = toHttp(exception);
    response.status(status).json({ code, message: exception.message });
  }
}
