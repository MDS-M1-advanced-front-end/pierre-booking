import type { CustomScalar } from '@nestjs/graphql';
import { Scalar } from '@nestjs/graphql';
import { GraphQLError, Kind, type ValueNode } from 'graphql';
import { DATE_REGEX } from './formats';

/**
 * Valide une date YYYY-MM-DD qui existe au calendrier (2027-02-30 est refusée).
 * @param value - Valeur reçue du client.
 * @returns La date, inchangée.
 * @throws {GraphQLError} si la valeur n'est pas une date valide (HTTP 400).
 */
function parseDate(value: unknown): string {
  if (typeof value === 'string' && DATE_REGEX.test(value)) {
    const time = Date.parse(`${value}T00:00:00Z`);
    if (!Number.isNaN(time) && new Date(time).toISOString().startsWith(value)) {
      return value;
    }
  }
  throw new GraphQLError('Date attendue au format YYYY-MM-DD.', {
    extensions: { code: 'VALIDATION_ERROR', status: 400 },
  });
}

/** Scalaire `Date` du schéma admin.graphql : date de Paris au format YYYY-MM-DD, transmise telle quelle. */
@Scalar('Date')
export class DateScalar implements CustomScalar<string, string> {
  /** Valeur passée en variable. */
  parseValue(value: unknown): string {
    return parseDate(value);
  }

  /** Valeur écrite dans la requête. */
  parseLiteral(ast: ValueNode): string {
    return parseDate(ast.kind === Kind.STRING ? ast.value : undefined);
  }

  /** Valeur renvoyée par un resolver (déjà au format YYYY-MM-DD). */
  serialize(value: unknown): string {
    return value as string;
  }
}
