import type {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  ProfileUpdateRequest,
  RefreshRequest,
  RegisterRequest,
} from '@room-booking/core';
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
import { IsOptionalNotNull } from '../../../../common/validators';
import { UserDTO } from './users.dto';

/**
 * Corps de POST /auth/register (RegisterRequest du contrat).
 */
export class RegisterDTO implements RegisterRequest {
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
export class LoginDTO implements LoginRequest {
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
export class RefreshDTO implements RefreshRequest {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

/**
 * Réponse de POST /auth/login et POST /auth/refresh (AuthResponse du contrat).
 */
export class AuthResponseDTO implements AuthResponse {
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
export class UpdateProfileDTO implements ProfileUpdateRequest {
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
export class ChangePasswordDTO implements ChangePasswordRequest {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
