import { ForbiddenException } from '@nestjs/common';
import type { Room } from '../../models/rooms.model.js';
import type { AuthUser } from '../auth/auth.decorators.js';
import { UserRole } from '../users/users.dto.js';

export function canManageRoom(room: Room, user?: AuthUser): boolean {
  return (
    user?.role === UserRole.ADMINISTRATEUR ||
    (user !== undefined && room.ownerId === user.id)
  );
}

// Réservé au gestionnaire propriétaire de la salle et aux administrateurs
export function assertCanManageRoom(room: Room, user: AuthUser): void {
  if (!canManageRoom(room, user)) throw new ForbiddenException();
}
