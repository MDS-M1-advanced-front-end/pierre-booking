import type { User } from '../../models/users.model.js';
import type { UserDTO } from './users.dto.js';

// Ne jamais renvoyer passwordHash
export function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
