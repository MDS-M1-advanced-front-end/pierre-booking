import {
  BadRequestException,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { Response } from 'express';

// Corps d'erreur du contrat (schéma Error de openapi.yml)
interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

const DEFAULTS: Record<number, ApiErrorBody> = {
  [HttpStatus.BAD_REQUEST]: {
    code: 'VALIDATION_ERROR',
    message: 'Les données fournies sont invalides.',
  },
  [HttpStatus.UNAUTHORIZED]: {
    code: 'UNAUTHORIZED',
    message: 'Authentification requise ou invalide.',
  },
  [HttpStatus.FORBIDDEN]: { code: 'FORBIDDEN', message: 'Accès interdit.' },
  [HttpStatus.NOT_FOUND]: {
    code: 'NOT_FOUND',
    message: 'Ressource introuvable.',
  },
  [HttpStatus.CONFLICT]: {
    code: 'CONFLICT',
    message: "Conflit avec l'état actuel de la ressource.",
  },
  [HttpStatus.INTERNAL_SERVER_ERROR]: {
    code: 'INTERNAL_ERROR',
    message: 'Erreur interne du serveur.',
  },
};

// Erreurs par champ, avec le chemin des champs imbriqués : { "slots.0.startTime": [...] }
function toDetails(
  errors: ValidationError[],
  parent?: string,
): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const error of errors) {
    const path = parent ? `${parent}.${error.property}` : error.property;
    if (error.constraints) details[path] = Object.values(error.constraints);
    if (error.children?.length) {
      Object.assign(details, toDetails(error.children, path));
    }
  }
  return details;
}

// exceptionFactory du ValidationPipe global
export function validationException(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException({
    ...DEFAULTS[HttpStatus.BAD_REQUEST],
    details: toDetails(errors),
  });
}

// Toutes les erreurs au format { code, message, details } du contrat
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (!(exception instanceof HttpException)) {
      this.logger.error(exception);
      response
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json(DEFAULTS[HttpStatus.INTERNAL_SERVER_ERROR]);
      return;
    }

    const status = exception.getStatus();
    const body: ApiErrorBody = {
      ...(DEFAULTS[status] ?? {
        code: 'HTTP_ERROR',
        message: exception.message,
      }),
    };
    const raw = exception.getResponse() as
      string | { code?: string; error?: string; message?: unknown };
    if (typeof raw === 'string') {
      body.message = raw;
    } else if (raw.code) {
      // Corps déjà au format du contrat (validationException, NonEmptyBodyPipe)
      Object.assign(body, raw);
    } else if (raw.error && typeof raw.message === 'string') {
      // new XxxException('message') : Nest ajoute `error` seulement quand un message est donné
      body.message = raw.message;
    }
    response.status(status).json(body);
  }
}
