/** Statistiques de la plateforme (`GET /admin/statistics`). */
export interface Statistics {
  totalUsers: number;
  totalRooms: number;
  totalReservations: number;
  confirmedReservations: number;
  cancelledReservations: number;
  totalRevenue: number;
}

/** Requête de lecture sur toute la plateforme (utilisateurs, salles, réservations). */
export interface StatisticsPort {
  /**
   * Calcule les statistiques. Utilisateurs et salles : totaux ; réservations : sur la période.
   * @param period - Bornes sur la date de début des réservations : [from, before[ ; absentes,
   *   toutes les réservations.
   * @returns Les compteurs et le chiffre d'affaires.
   */
  compute(period: { from?: Date; before?: Date }): Promise<Statistics>;
}

/** Jeton d'injection de `StatisticsPort`. */
export const STATISTICS = 'StatisticsPort';
