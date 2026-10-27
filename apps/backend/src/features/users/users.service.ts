import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../../common/database-errors.js';
import { toSkipTake } from '../../common/pagination.dto.js';
import { User } from '../../models/users.model.js';
import type {
  PaginatedUsersDTO,
  UpdateUserDTO,
  UserDTO,
  UsersQueryDTO,
} from './users.dto.js';
import { toUserDTO } from './users.mapper.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async findAll(query: UsersQueryDTO): Promise<PaginatedUsersDTO> {
    const { skip, take, page, pageSize } = toSkipTake(query);
    const [users, total] = await this.users.findAndCount({
      where: query.role ? { role: query.role } : {},
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return { items: users.map(toUserDTO), page, pageSize, total };
  }

  async findOne(userId: string): Promise<UserDTO> {
    return toUserDTO(await this.getOrFail(userId));
  }

  async update(userId: string, body: UpdateUserDTO): Promise<UserDTO> {
    const user = await this.getOrFail(userId);
    Object.assign(user, body);
    if (body.email) user.email = body.email.toLowerCase();
    try {
      return toUserDTO(await this.users.save(user));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Adresse e-mail déjà utilisée');
      }
      throw error;
    }
  }

  async remove(userId: string): Promise<void> {
    const user = await this.getOrFail(userId);
    try {
      await this.users.remove(user);
    } catch (error) {
      // Réservations liées à l'utilisateur ou à ses salles (ON DELETE RESTRICT)
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(
          "L'utilisateur a des réservations, il ne peut pas être supprimé",
        );
      }
      throw error;
    }
  }

  private async getOrFail(userId: string): Promise<User> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }
}
