import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext, type GqlContextType } from '@nestjs/graphql';
import type { Request, Response } from 'express';

/**
 * Requête et réponse Express d'un appel REST ou GraphQL. En GraphQL, `switchToHttp()` ne renvoie
 * pas la requête (les arguments du handler sont ceux du resolver) : elle est lue dans le contexte
 * GraphQL, où GraphQLModule la dépose (`context` dans app.module.ts).
 * @param context - Contexte d'exécution d'un guard ou d'un décorateur.
 * @returns La requête et la réponse Express.
 */
export function httpOf(context: ExecutionContext): {
  req: Request;
  res: Response;
} {
  if (context.getType<GqlContextType>() === 'graphql') {
    return GqlExecutionContext.create(context).getContext<{
      req: Request;
      res: Response;
    }>();
  }
  const http = context.switchToHttp();
  return { req: http.getRequest<Request>(), res: http.getResponse<Response>() };
}
