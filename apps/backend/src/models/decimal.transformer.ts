import type { ValueTransformer } from 'typeorm';

// pg renvoie les colonnes decimal sous forme de chaîne
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? value : Number(value)),
};
