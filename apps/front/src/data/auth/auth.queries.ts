import type {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  Result,
  User,
} from '@room-booking/core';
import * as api from '../client';
import { withSession } from '../errors';
import { clearSession, saveSession, updateSessionUser } from './session.svelte';

/**
 * Connecte l'utilisateur et enregistre la session. Un `401` ici signifie « identifiants
 * incorrects » : la session n'est pas touchée.
 */
export async function login(credentials: LoginRequest): Promise<Result<AuthResponse>> {
  const result = await api.login(credentials);
  if (result.ok) saveSession(result.data);
  return result;
}

/**
 * Crée le compte puis connecte automatiquement avec les mêmes identifiants (décision 7).
 * @returns La connexion (session enregistrée), ou l'erreur de l'inscription (`409` : e-mail pris)
 *   ou de la connexion.
 */
export async function register(body: RegisterRequest): Promise<Result<AuthResponse>> {
  const created = await api.register(body);
  if (!created.ok) return created;
  return login({ email: body.email, password: body.password });
}

/** Déconnecte : supprime le jeton de `core` et la session enregistrée. */
export function logout(): void {
  api.logout();
  clearSession();
}

/** Profil de l'utilisateur connecté ; met à jour la session en cas de succès. */
export async function getMe(): Promise<Result<User>> {
  const result = await withSession(api.getMe());
  if (result.ok) updateSessionUser(result.data);
  return result;
}

/** Change le mot de passe de l'utilisateur connecté (204). */
export function changePassword(body: ChangePasswordRequest): Promise<Result<void>> {
  return withSession(api.changePassword(body));
}
