import type { ProfileUpdateRequest, Result, User } from '@room-booking/core';
import * as api from '../client';
import { withSession } from '../errors';

/**
 * Modifie le profil de l'utilisateur connecté (`PATCH /auth/me`). `PATCH /users/{id}` est réservé
 * aux administrateurs : un client ou un gestionnaire y recevrait un `403`. Seuls le prénom, le nom
 * et l'e-mail sont envoyés, jamais `role`, même s'il est présent à l'exécution (anomalie 7).
 * @param body - Prénom, nom, e-mail.
 */
export function updateProfile(body: ProfileUpdateRequest): Promise<Result<User>> {
  const { firstName, lastName, email } = body;
  const safeBody: ProfileUpdateRequest = {};
  if (firstName !== undefined) safeBody.firstName = firstName;
  if (lastName !== undefined) safeBody.lastName = lastName;
  if (email !== undefined) safeBody.email = email;
  return withSession(() => api.updateMe(safeBody));
}
