import type { ValueTransformer } from 'typeorm';

/**
 * Transformer TypeORM des colonnes `decimal` : pg les renvoie sous forme de chaîne,
 * le domaine les manipule en nombres.
 */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? value : Number(value)),
};
