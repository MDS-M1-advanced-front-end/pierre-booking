import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { httpOf } from './request-context';

/**
 * ThrottlerGuard qui lit aussi la requête d'un appel GraphQL : celui de @nestjs/throttler passe
 * par `switchToHttp()` et ne trouve pas d'IP en GraphQL. Une requête GraphQL compte pour un appel.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override getRequestResponse(context: ExecutionContext) {
    return httpOf(context);
  }
}
