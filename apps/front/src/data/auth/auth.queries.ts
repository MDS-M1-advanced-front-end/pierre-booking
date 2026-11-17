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
import {
  clearSession,
  expireSession,
  saveSession,
  session,
  updateSessionUser,
} from './session.svelte';
import { clearOutbox } from '../offline/outbox.svelte';

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

/**
 * Déconnecte : supprime le jeton de `core`, la session enregistrée et les demandes de réservation
 * en attente d'envoi (déconnexion volontaire : appareil peut-être partagé).
 */
export function logout(): void {
  api.logout();
  clearSession();
  clearOutbox();
}

/** Profil de l'utilisateur connecté ; met à jour la session en cas de succès. */
export async function getMe(): Promise<Result<User>> {
  const result = await withSession(() => api.getMe());
  if (result.ok) updateSessionUser(result.data);
  return result;
}

/**
 * Change le mot de passe de l'utilisateur connecté (204).
 * Pas de `withSession` : sur cette route, un `401` signifie le plus probablement « mot de passe
 * actuel incorrect » (le contrat ne le précise pas) ; l'écran l'affiche au lieu de déconnecter.
 * Une session réellement expirée sera rattrapée par la requête suivante.
 *
 * Le back révoque tous les jetons émis avant le changement, y compris celui de la session en
 * cours : on se reconnecte donc aussitôt avec le nouveau mot de passe, pour rester connecté. Si
 * cette reconnexion échoue, la session est expirée (retour à la connexion).
 */
export async function changePassword(body: ChangePasswordRequest): Promise<Result<void>> {
  const result = await api.changePassword(body);
  const email = session.user?.email;
  if (!result.ok || !email) return result;
  const relogin = await login({ email, password: body.newPassword });
  if (!relogin.ok) expireSession();
  return result;
}
