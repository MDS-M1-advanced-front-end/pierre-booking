import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { User } from '../../models/users.model.js';
import type { UserRole } from '../users/users.dto.js';
import { IS_PUBLIC_KEY, ROLES_KEY, type AuthUser } from './auth.decorators.js';

// Guard global : jeton Bearer obligatoire sauf sur les routes @Public(), puis contrôle @Roles()
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    @InjectRepository(User) private readonly users: Repository<User>,
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
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      // Relu en base : un changement de rôle ou une suppression s'applique sans attendre
      // l'expiration du jeton (une requête par appel authentifié)
      const user = await this.users.findOne({
        where: { id: payload.sub },
        select: { id: true, role: true },
      });
      return user ? { id: user.id, role: user.role } : undefined;
    } catch {
      return undefined;
    }
  }
}
