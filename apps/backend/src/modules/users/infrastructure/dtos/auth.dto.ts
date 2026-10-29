import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsOptionalNotNull } from '../../../../common/validators.js';
import { UserDTO } from './users.dto.js';

/**
 * Corps de POST /auth/register (RegisterRequest du contrat).
 */
export class RegisterDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

/**
 * Corps de POST /auth/login (LoginRequest du contrat).
 */
export class LoginDTO {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

/**
 * Corps de POST /auth/refresh (RefreshRequest du contrat).
 */
export class RefreshDTO {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

/**
 * Réponse de POST /auth/login et POST /auth/refresh (AuthResponse du contrat).
 */
export class AuthResponseDTO {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsInt()
  @IsOptional()
  expiresIn?: number;

  @ValidateNested()
  @Type(() => UserDTO)
  user: UserDTO;
}

/**
 * Corps de PATCH /auth/me (ProfileUpdateRequest du contrat) : le rôle ne se modifie pas ici.
 */
export class UpdateProfileDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptionalNotNull()
  firstName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptionalNotNull()
  lastName?: string;

  @IsEmail()
  @MaxLength(255)
  @IsOptionalNotNull()
  email?: string;
}

/**
 * Corps de PATCH /auth/password (ChangePasswordRequest du contrat).
 */
export class ChangePasswordDTO {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
