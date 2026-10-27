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
import { DATE_REGEX, TIME_REGEX } from '../../common/formats.js';
import {
  PaginatedDTO,
  PaginationQueryDTO,
} from '../../common/pagination.dto.js';

export enum RoomStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

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
  @IsOptional()
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

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsISO8601()
  @IsOptional()
  createdAt?: string;
}

// POST /rooms
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
  @IsOptional()
  equipment?: string[];

  @IsNumber()
  @Min(0)
  pricePerHour: number;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;
}

// PATCH /rooms/{roomId}
export class UpdateRoomDTO {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  location?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  equipment?: string[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerHour?: number;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsEnum(RoomStatus)
  @IsOptional()
  status?: RoomStatus;
}

// GET /rooms
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

export class PaginatedRoomsDTO extends PaginatedDTO {
  @ValidateNested({ each: true })
  @Type(() => RoomDTO)
  items: RoomDTO[];
}

export class AvailabilitySlotDTO {
  @Matches(TIME_REGEX)
  startTime: string;

  @Matches(TIME_REGEX)
  endTime: string;

  @IsBoolean()
  available: boolean;
}

// GET /rooms/{roomId}/availability
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

// PUT /rooms/{roomId}/availability
export class UpdateAvailabilityDTO {
  @Matches(DATE_REGEX)
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDTO)
  slots: AvailabilitySlotDTO[];
}
