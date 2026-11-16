import type { CustomScalar } from '@nestjs/graphql';
import { Scalar } from '@nestjs/graphql';
import { GraphQLError, Kind, type ValueNode } from 'graphql';

/**
 * Valide un instant ISO 8601 reçu du client.
 * @param value - Valeur reçue du client.
 * @returns L'instant, normalisé en UTC.
 * @throws {GraphQLError} si la valeur n'est pas un instant valide (HTTP 400).
 */
function parseDateTime(value: unknown): string {
  if (typeof value === 'string') {
    const time = Date.parse(value);
    if (!Number.isNaN(time)) return new Date(time).toISOString();
  }
  throw new GraphQLError('Instant attendu au format ISO 8601.', {
    extensions: { code: 'VALIDATION_ERROR', status: 400 },
  });
}

/** Scalaire `DateTime` du schéma admin.graphql : instant ISO 8601 en UTC, comme les date-time du REST. */
@Scalar('DateTime')
export class DateTimeScalar implements CustomScalar<string, string> {
  /** Valeur passée en variable. */
  parseValue(value: unknown): string {
    return parseDateTime(value);
  }

  /** Valeur écrite dans la requête. */
  parseLiteral(ast: ValueNode): string {
    return parseDateTime(ast.kind === Kind.STRING ? ast.value : undefined);
  }

  /** Valeur renvoyée par un resolver : une Date ou une chaîne déjà au format ISO. */
  serialize(value: unknown): string {
    return value instanceof Date ? value.toISOString() : (value as string);
  }
}
