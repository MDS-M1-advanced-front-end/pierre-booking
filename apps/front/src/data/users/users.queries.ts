import type { Result, User, UserUpdateRequest } from '@room-booking/core';
import * as api from '../client';
import { withSession } from '../errors';

/** Champs qu'un utilisateur peut modifier : tout sauf `role`. */
export type UserProfileUpdate = Omit<UserUpdateRequest, 'role'>;

/** Consulte un utilisateur. */
export function getUser(userId: string): Promise<Result<User>> {
  return withSession(api.getUser(userId));
}

/**
 * Modifie un utilisateur. `UserUpdateRequest` accepte `role` (anomalie 7) : le front ne l'envoie
 * jamais, il est retiré du corps même s'il est présent à l'exécution.
 * @param userId - UUID de l'utilisateur.
 * @param body - Prénom, nom, e-mail.
 */
export function updateUser(userId: string, body: UserProfileUpdate): Promise<Result<User>> {
  const { firstName, lastName, email } = body;
  const safeBody: UserProfileUpdate = {};
  if (firstName !== undefined) safeBody.firstName = firstName;
  if (lastName !== undefined) safeBody.lastName = lastName;
  if (email !== undefined) safeBody.email = email;
  return withSession(api.updateUser(userId, safeBody));
}
