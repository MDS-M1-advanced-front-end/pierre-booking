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
import { UserRole } from '../../domain/entities/user.entity.js';
import { IsOptionalNotNull } from '../../../../common/validators.js';
import {
  PaginatedDTO,
  PaginationQueryDTO,
} from '../../../../common/pagination.dto.js';

/**
 * Utilisateur renvoyé par l'API (User du contrat), sans le hash du mot de passe.
 */
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

/**
 * Corps de PATCH /users/{userId} (UserUpdateRequest du contrat).
 */
export class UpdateUserDTO {
  @IsString()
  @IsNotEmpty()
  @IsOptionalNotNull()
  firstName?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptionalNotNull()
  lastName?: string;

  @IsEmail()
  @IsOptionalNotNull()
  email?: string;

  @IsEnum(UserRole)
  @IsOptionalNotNull()
  role?: UserRole;
}

/**
 * Paramètres de GET /users.
 */
export class UsersQueryDTO extends PaginationQueryDTO {
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

/**
 * Réponse de GET /users (PaginatedUsers du contrat).
 */
export class PaginatedUsersDTO extends PaginatedDTO {
  @ValidateNested({ each: true })
  @Type(() => UserDTO)
  items: UserDTO[];
}
