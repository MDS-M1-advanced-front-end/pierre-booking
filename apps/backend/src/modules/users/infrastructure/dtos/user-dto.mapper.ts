import type { User } from '../../domain/entities/user.entity.js';
import type { UserDTO } from './users.dto.js';

/**
 * Convertit un utilisateur du domaine en réponse de l'API. Ne jamais renvoyer passwordHash.
 * @param user - Utilisateur enregistré.
 * @returns L'utilisateur au format du contrat.
 */
export function toUserDTO(user: User): UserDTO {
  return {
    id: user.id!,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt?.toISOString(),
  };
}
