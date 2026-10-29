import { Room } from '../entities/room.entity';

/** Critères de recherche des salles (GET /rooms), déjà traduits par le cas d'usage. */
export interface RoomSearchCriteria {
  search?: string;
  location?: string;
  capacityMin?: number;
  capacityMax?: number;
  // Restreint aux salles données (ex. salles libres sur un créneau)
  ids?: string[];
  // Salles inactives : toutes, celles d'un propriétaire, ou aucune
  inactive: 'all' | { ownerId: string } | 'none';
  page: number;
  pageSize: number;
}

/** Accès aux salles. */
export interface RoomRepositoryInterface {
  /**
   * Recherche paginée des salles, triées par nom.
   * @param criteria - Filtres, visibilité des salles inactives et pagination.
   * @returns La page de salles et le nombre total de résultats.
   */
  findPage(criteria: RoomSearchCriteria): Promise<{
    items: Room[];
    total: number;
  }>;
  /**
   * Lit une salle, quel que soit son statut.
   * @param id - Identifiant de la salle.
   * @returns La salle, ou null si elle n'existe pas.
   */
  findById(id: string): Promise<Room | null>;
  /**
   * Crée la salle (sans identifiant) ou la met à jour.
   * @param room - Salle à enregistrer.
   * @returns La salle relue après enregistrement (identifiant, date de création).
   */
  save(room: Room): Promise<Room>;
  /**
   * Supprime une salle et ses disponibilités.
   * @param id - Identifiant de la salle.
   * @throws {RoomHasReservationsException} Des réservations sont rattachées à la salle.
   */
  delete(id: string): Promise<void>;
}

/** Jeton d'injection de {@link RoomRepositoryInterface}. */
export const ROOM_REPOSITORY = 'RoomRepositoryInterface';
