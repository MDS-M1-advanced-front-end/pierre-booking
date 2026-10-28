import type { AuthUser } from '../../../users/infrastructure/auth/auth.decorators.js';
import { UserRole } from '../../../users/domain/entities/user.entity.js';
import type { ReservationActor } from '../../domain/entities/reservation.entity.js';

// Utilisateur authentifié → acteur du domaine
export const toActor = (user: AuthUser): ReservationActor => ({
  id: user.id,
  isAdmin: user.role === UserRole.ADMINISTRATEUR,
  isManager: user.role === UserRole.GESTIONNAIRE,
});
