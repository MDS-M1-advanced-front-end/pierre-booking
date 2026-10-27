import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { UserRole } from '../users/users.dto.js';
import { IS_PUBLIC_KEY, ROLES_KEY, type AuthUser } from './auth.decorators.js';

// Guard global : jeton Bearer obligatoire sauf sur les routes @Public(), puis contrôle @Roles()
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();

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
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        role: UserRole;
      }>(token);
      return { id: payload.sub, role: payload.role };
    } catch {
      return undefined;
    }
  }
}
