import { QueryFailedError } from 'typeorm';

// Codes d'erreur PostgreSQL
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

/**
 * L'erreur vient-elle de PostgreSQL avec ce code ?
 * @param error - Erreur attrapée autour d'une requête TypeORM.
 * @param code - Code d'erreur PostgreSQL (SQLSTATE).
 */
function hasCode(error: unknown, code: string): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === code
  );
}

/**
 * Violation d'une contrainte d'unicité (ex. e-mail déjà utilisé, paiement déjà existant).
 * @param error - Erreur attrapée autour d'une écriture.
 */
export const isUniqueViolation = (error: unknown) =>
  hasCode(error, UNIQUE_VIOLATION);

/**
 * Violation d'une clé étrangère (ex. suppression d'une salle qui a des réservations,
 * à cause de `ON DELETE RESTRICT`).
 * @param error - Erreur attrapée autour d'une écriture.
 */
export const isForeignKeyViolation = (error: unknown) =>
  hasCode(error, FOREIGN_KEY_VIOLATION);
