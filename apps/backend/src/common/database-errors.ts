import { QueryFailedError } from 'typeorm';

// Codes d'erreur PostgreSQL
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

function hasCode(error: unknown, code: string): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === code
  );
}

export const isUniqueViolation = (error: unknown) =>
  hasCode(error, UNIQUE_VIOLATION);

export const isForeignKeyViolation = (error: unknown) =>
  hasCode(error, FOREIGN_KEY_VIOLATION);
