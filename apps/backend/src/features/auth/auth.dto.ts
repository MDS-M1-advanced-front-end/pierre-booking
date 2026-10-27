import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsOptionalNotNull } from '../../common/validators.js';
import { UserDTO } from '../users/users.dto.js';

// POST /auth/register
export class RegisterDTO {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// POST /auth/login
export class LoginDTO {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

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

// PATCH /auth/me : le rôle ne se modifie pas ici
export class UpdateProfileDTO {
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
}

// PATCH /auth/password
export class ChangePasswordDTO {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
