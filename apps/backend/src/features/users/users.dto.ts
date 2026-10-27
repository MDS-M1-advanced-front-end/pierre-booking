import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import {
  PaginatedDTO,
  PaginationQueryDTO,
} from '../../common/pagination.dto.js';

export enum UserRole {
  CLIENT = 'CLIENT',
  GESTIONNAIRE = 'GESTIONNAIRE',
  ADMINISTRATEUR = 'ADMINISTRATEUR',
}

export class UserDTO {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsISO8601()
  @IsOptional()
  createdAt?: string;
}

// PATCH /users/{userId}
export class UpdateUserDTO {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

// GET /users
export class UsersQueryDTO extends PaginationQueryDTO {
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

export class PaginatedUsersDTO extends PaginatedDTO {
  @ValidateNested({ each: true })
  @Type(() => UserDTO)
  items: UserDTO[];
}
