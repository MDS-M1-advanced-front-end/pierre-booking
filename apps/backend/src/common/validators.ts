import { ValidateIf } from 'class-validator';

// Comme @IsOptional(), mais refuse null : pour les champs NOT NULL en base
// (@IsOptional() laisse passer null, qui arrivait jusqu'à la base et donnait une 500)
export const IsOptionalNotNull = () =>
  ValidateIf((_object, value) => value !== undefined);
