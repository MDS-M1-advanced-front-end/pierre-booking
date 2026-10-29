import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { httpOf } from '../../../../common/request-context';
import { AuthenticateUseCase } from '../../application/use-cases/authenticate.use-case';
import type { UserRole } from '../../domain/entities/user.entity';
import { IS_PUBLIC_KEY, ROLES_KEY, type AuthUser } from './auth.decorators';

/**
 * Guard global : jeton Bearer obligatoire sauf sur les routes @Public(), puis contrôle @Roles().
 * Enregistré par UsersModule (APP_GUARD), il s'applique à tous les modules, et aux requêtes
 * GraphQL (resolvers @Query ; pas aux @ResolveField, atteints seulement à travers eux).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authenticateUseCase: AuthenticateUseCase,
    private readonly reflector: Reflector,
  ) {}

  /**
   * @param context - Contexte de la requête HTTP ou GraphQL.
   * @returns `true` si la requête peut continuer.
   * @throws {UnauthorizedException} sans jeton valide sur une route protégée (401).
   * @throws {ForbiddenException} si le rôle n'est pas dans @Roles() (403).
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    const request: Request & { user?: AuthUser } = httpOf(context).req;

    request.user = await this.readUser(request);
    if (isPublic) return true;
    if (!request.user) throw new UnauthorizedException();

    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      targets,
    );
    if (roles && !roles.includes(request.user.role)) {
      throw new ForbiddenException();
    }
    return true;
  }

  private async readUser(request: Request): Promise<AuthUser | undefined> {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) return undefined;
    const user = await this.authenticateUseCase.execute(token);
    return user ? { id: user.id!, role: user.role } : undefined;
  }
}
