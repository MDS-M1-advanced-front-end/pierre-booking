import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import type { UserRole } from '../../domain/entities/user.entity.js';

/**
 * Utilisateur connecté, déposé dans `request.user` par AuthGuard (rôle relu en base).
 */
export interface AuthUser {
  id: string;
  role: UserRole;
}

/**
 * Clé de métadonnée posée par @Public().
 */
export const IS_PUBLIC_KEY = 'isPublic';
/**
 * Clé de métadonnée posée par @Roles().
 */
export const ROLES_KEY = 'roles';

/**
 * Route sans authentification (security: [] dans l'OpenAPI). Si un jeton valide est
 * envoyé, l'utilisateur est quand même disponible avec @CurrentUser().
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Restreint une route ou un controller à certains rôles (403 sinon).
 * @param roles - Rôles autorisés.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Injecte l'utilisateur connecté dans un paramètre de handler.
 * `undefined` sur une route publique appelée sans jeton.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<{ user?: AuthUser }>().user,
);
