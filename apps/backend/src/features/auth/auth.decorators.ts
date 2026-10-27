import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import type { UserRole } from '../users/users.dto.js';

// Contenu du JWT, disponible dans request.user
export interface AuthUser {
  id: string;
  role: UserRole;
}

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

// Route sans authentification (security: [] dans l'OpenAPI)
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Utilisateur connecté, undefined sur une route publique appelée sans jeton
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<{ user?: AuthUser }>().user,
);
