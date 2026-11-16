// Espace d'administration, entièrement en GraphQL (admin.graphql du core). Toutes ces opérations
// exigent une session : un `401` la renouvelle ou la vide (voir `withSession`).
import type { Result } from '@room-booking/core';
import type {
  AdminCancelReservationMutation,
  AdminChangeUserRoleMutation,
  AdminConfirmReservationMutation,
  AdminDashboardQuery,
  AdminDashboardQueryVariables,
  AdminDeleteUserMutation,
  AdminRejectReservationMutation,
  AdminReservationsQuery,
  AdminReservationsQueryVariables,
  AdminUsersQuery,
  AdminUsersQueryVariables,
  UserRole,
} from '@room-booking/core/graphql';
import * as api from '../client';
import { withSession } from '../errors';

/** Tableau de bord : compteurs, répartition par statut, série, classements. */
export function getDashboard(
  variables: AdminDashboardQueryVariables,
): Promise<Result<AdminDashboardQuery>> {
  return withSession(() => api.getAdminDashboard(variables));
}

/** Une page d'utilisateurs, filtrable par rôle. */
export function listUsers(variables: AdminUsersQueryVariables): Promise<Result<AdminUsersQuery>> {
  return withSession(() => api.getAdminUsers(variables));
}

/** Change le rôle d'un utilisateur (`409` sur son propre compte). */
export function changeUserRole(
  userId: string,
  role: UserRole,
): Promise<Result<AdminChangeUserRoleMutation>> {
  return withSession(() => api.adminChangeUserRole({ userId, role }));
}

/** Supprime un utilisateur (`409` s'il a des réservations, ou sur son propre compte). */
export function deleteUser(userId: string): Promise<Result<AdminDeleteUserMutation>> {
  return withSession(() => api.adminDeleteUser({ userId }));
}

/** Une page de toutes les réservations, filtrable par statut, salle et client. */
export function listReservations(
  variables: AdminReservationsQueryVariables,
): Promise<Result<AdminReservationsQuery>> {
  return withSession(() => api.getAdminReservations(variables));
}

/** Confirme une demande en attente (`409` si elle ne l'est plus). */
export function confirmReservation(
  reservationId: string,
): Promise<Result<AdminConfirmReservationMutation>> {
  return withSession(() => api.adminConfirmReservation({ reservationId }));
}

/** Refuse une demande en attente, avec un motif facultatif (`409` si elle ne l'est plus). */
export function rejectReservation(
  reservationId: string,
  reason?: string,
): Promise<Result<AdminRejectReservationMutation>> {
  return withSession(() => api.adminRejectReservation({ reservationId, reason: reason ?? null }));
}

/** Annule une réservation en attente ou confirmée (`409` si elle n'est plus active). */
export function cancelReservation(
  reservationId: string,
): Promise<Result<AdminCancelReservationMutation>> {
  return withSession(() => api.adminCancelReservation({ reservationId }));
}
