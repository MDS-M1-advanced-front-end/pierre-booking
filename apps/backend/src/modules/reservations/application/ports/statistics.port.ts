export interface Statistics {
  totalUsers: number;
  totalRooms: number;
  totalReservations: number;
  confirmedReservations: number;
  cancelledReservations: number;
  totalRevenue: number;
}

// Requête de lecture sur toute la plateforme (utilisateurs, salles, réservations)
export interface StatisticsPort {
  // Bornes sur la date de début des réservations : [from, before[
  compute(period: { from?: Date; before?: Date }): Promise<Statistics>;
}

export const STATISTICS = 'StatisticsPort';
