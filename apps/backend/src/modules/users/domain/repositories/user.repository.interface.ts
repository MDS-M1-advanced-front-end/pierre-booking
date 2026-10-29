import type { User, UserRole } from '../entities/user.entity';

/**
 * Persistance des utilisateurs. Implémenté par TypeormUserRepository.
 */
export interface UserRepositoryInterface {
  /**
   * Lit un utilisateur par son identifiant.
   * @param id - UUID de l'utilisateur.
   * @returns L'utilisateur, ou `null` s'il n'existe pas.
   */
  findById(id: string): Promise<User | null>;
  /**
   * Lit un utilisateur par son e-mail.
   * @param email - Adresse déjà normalisée (User.normalizeEmail).
   * @returns L'utilisateur, ou `null` si aucun compte n'a cet e-mail.
   */
  findByEmail(email: string): Promise<User | null>;
  /**
   * Liste paginée des utilisateurs, les plus récents d'abord.
   * @param criteria - Rôle (facultatif), page (à partir de 1) et taille de page.
   * @returns Les utilisateurs de la page et le nombre total.
   */
  findPage(criteria: {
    role?: UserRole;
    page: number;
    pageSize: number;
  }): Promise<{ items: User[]; total: number }>;
  /**
   * Crée ou met à jour un utilisateur (création si `id` est absent).
   * @param user - Utilisateur à enregistrer.
   * @returns L'utilisateur relu en base (avec `id` et `createdAt`).
   * @throws {EmailAlreadyUsedException} si l'e-mail est pris.
   */
  save(user: User): Promise<User>;
  /**
   * Supprime un utilisateur ; ses salles sont supprimées avec lui (ON DELETE CASCADE).
   * @param id - UUID de l'utilisateur.
   * @throws {UserHasReservationsException} si des réservations lui sont rattachées, à lui ou à ses salles.
   */
  delete(id: string): Promise<void>;
}

/**
 * Jeton d'injection de UserRepositoryInterface.
 */
export const USER_REPOSITORY = 'UserRepositoryInterface';
