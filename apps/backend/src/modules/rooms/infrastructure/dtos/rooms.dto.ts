import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { DATE_REGEX, TIME_REGEX } from '../../../../common/formats.js';
import { IsOptionalNotNull } from '../../../../common/validators.js';
import {
  PaginatedDTO,
  PaginationQueryDTO,
} from '../../../../common/pagination.dto.js';

import { RoomStatus } from '../../domain/entities/room.entity.js';

/** Salle renvoyée par l'API (schéma Room du contrat). */
export class RoomDTO {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptionalNotNull()
  equipment?: string[];

  @IsNumber()
  @Min(0)
  pricePerHour: number;

  @IsEnum(RoomStatus)
  @IsNotEmpty()
  status: RoomStatus;

  @IsUUID()
  @IsOptional()
  ownerId?: string;

  // URL sans domaine de premier niveau acceptée (localhost), comme format: uri
  @IsUrl({ require_tld: false })
  @IsOptional()
  imageUrl?: string;

  @IsISO8601()
  @IsOptional()
  createdAt?: string;
}

/** Corps de POST /rooms (schéma RoomCreateRequest). */
export class CreateRoomDTO {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptionalNotNull()
  equipment?: string[];

  @IsNumber()
  @Min(0)
  pricePerHour: number;

  // URL sans domaine de premier niveau acceptée (localhost), comme format: uri
  @IsUrl({ require_tld: false })
  @IsOptional()
  imageUrl?: string;
}

/**
 * Corps de PATCH /rooms/{roomId} (schéma RoomUpdateRequest). description et imageUrl acceptent
 * null pour effacer la valeur.
 */
export class UpdateRoomDTO {
  @IsString()
  @IsNotEmpty()
  @IsOptionalNotNull()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsInt()
  @Min(1)
  @IsOptionalNotNull()
  capacity?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptionalNotNull()
  location?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptionalNotNull()
  equipment?: string[];

  @IsNumber()
  @Min(0)
  @IsOptionalNotNull()
  pricePerHour?: number;

  // URL sans domaine de premier niveau acceptée (localhost), comme format: uri
  @IsUrl({ require_tld: false })
  @IsOptional()
  imageUrl?: string | null;

  @IsEnum(RoomStatus)
  @IsOptionalNotNull()
  status?: RoomStatus;
}

/** Paramètres de GET /rooms : recherche, capacité, créneau et pagination. */
export class RoomsQueryDTO extends PaginationQueryDTO {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  search?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  location?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  @IsOptional()
  capacityMin?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  @IsOptional()
  capacityMax?: number;

  @Matches(DATE_REGEX)
  @IsOptional()
  date?: string;

  @Matches(TIME_REGEX)
  @IsOptional()
  startTime?: string;

  @Matches(TIME_REGEX)
  @IsOptional()
  endTime?: string;

  // @Type(() => Boolean) convertirait "false" en true
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  available?: boolean;
}

/** Page de salles renvoyée par GET /rooms. */
export class PaginatedRoomsDTO extends PaginatedDTO {
  @ValidateNested({ each: true })
  @Type(() => RoomDTO)
  items: RoomDTO[];
}

/** Créneau d'une salle (schéma AvailabilitySlot), en réponse ou dans le corps du PUT. */
export class AvailabilitySlotDTO {
  @Matches(TIME_REGEX)
  startTime: string;

  @Matches(TIME_REGEX)
  endTime: string;

  @IsBoolean()
  available: boolean;
}

/** Paramètres de GET /rooms/{roomId}/availability. */
export class AvailabilityQueryDTO {
  @Matches(DATE_REGEX)
  date: string;

  @Matches(TIME_REGEX)
  @IsOptional()
  startTime?: string;

  @Matches(TIME_REGEX)
  @IsOptional()
  endTime?: string;
}

/** Corps de PUT /rooms/{roomId}/availability (schéma AvailabilityUpdateRequest). */
export class UpdateAvailabilityDTO {
  @Matches(DATE_REGEX)
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDTO)
  slots: AvailabilitySlotDTO[];
}
