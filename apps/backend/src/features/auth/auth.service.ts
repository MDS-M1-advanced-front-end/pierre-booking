import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../common/database-errors.js';
import { User } from '../../models/users.model.js';
import { UserRole, type UserDTO } from '../users/users.dto.js';
import { toUserDTO } from '../users/users.mapper.js';
import type { AuthUser } from './auth.decorators.js';
import type {
  AuthResponseDTO,
  ChangePasswordDTO,
  LoginDTO,
  RegisterDTO,
} from './auth.dto.js';
import { hashPassword, verifyPassword } from './password.js';

export const TOKEN_TTL_SECONDS = 3600;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(body: RegisterDTO): Promise<UserDTO> {
    try {
      const user = await this.users.save(
        this.users.create({
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email.toLowerCase(),
          passwordHash: await hashPassword(body.password),
          role: UserRole.CLIENT,
        }),
      );
      return toUserDTO(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Adresse e-mail déjà utilisée');
      }
      throw error;
    }
  }

  async login(body: LoginDTO): Promise<AuthResponseDTO> {
    const user = await this.users.findOneBy({
      email: body.email.toLowerCase(),
    });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
    });
    return {
      accessToken,
      expiresIn: TOKEN_TTL_SECONDS,
      user: toUserDTO(user),
    };
  }

  async me(authUser: AuthUser): Promise<UserDTO> {
    const user = await this.users.findOneBy({ id: authUser.id });
    if (!user) throw new UnauthorizedException();
    return toUserDTO(user);
  }

  async changePassword(
    authUser: AuthUser,
    body: ChangePasswordDTO,
  ): Promise<void> {
    const user = await this.users.findOneBy({ id: authUser.id });
    if (!user) throw new UnauthorizedException();
    if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }
    user.passwordHash = await hashPassword(body.newPassword);
    await this.users.save(user);
  }
}
