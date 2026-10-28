import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../../../../common/database-errors.js';
import type { User, UserRole } from '../../domain/entities/user.entity.js';
import {
  EmailAlreadyUsedException,
  UserHasReservationsException,
} from '../../domain/exceptions/user-domain.exception.js';
import type { UserRepositoryInterface } from '../../domain/repositories/user.repository.interface.js';
import { TypeOrmUserEntity } from './typeorm-user.entity.js';
import { UserMapper } from './user.mapper.js';

/**
 * Implémentation TypeORM de UserRepositoryInterface. Les erreurs PostgreSQL (unicité,
 * clé étrangère) sont traduites en exceptions du domaine.
 */
@Injectable()
export class TypeormUserRepository implements UserRepositoryInterface {
  constructor(
    @InjectRepository(TypeOrmUserEntity)
    private readonly typeormUserRepository: Repository<TypeOrmUserEntity>,
  ) {}

  /**
   * @param id - UUID de l'utilisateur.
   * @returns L'utilisateur, ou `null`.
   */
  async findById(id: string): Promise<User | null> {
    const entity = await this.typeormUserRepository.findOneBy({ id });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  /**
   * @param email - Adresse normalisée.
   * @returns L'utilisateur, ou `null`.
   */
  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.typeormUserRepository.findOneBy({ email });
    return entity ? UserMapper.toDomain(entity) : null;
  }

  /**
   * @param criteria - Rôle (facultatif), page et taille de page.
   * @returns Les utilisateurs de la page (les plus récents d'abord) et le nombre total.
   */
  async findPage(criteria: {
    role?: UserRole;
    page: number;
    pageSize: number;
  }): Promise<{ items: User[]; total: number }> {
    const [entities, total] = await this.typeormUserRepository.findAndCount({
      // TypeORM refuse les valeurs undefined dans un where
      where: criteria.role ? { role: criteria.role } : {},
      order: { createdAt: 'DESC' },
      skip: (criteria.page - 1) * criteria.pageSize,
      take: criteria.pageSize,
    });
    return {
      items: entities.map((entity) => UserMapper.toDomain(entity)),
      total,
    };
  }

  /**
   * @param user - Utilisateur à créer ou mettre à jour.
   * @returns L'utilisateur relu en base.
   * @throws {EmailAlreadyUsedException} si l'e-mail est pris (violation d'unicité).
   */
  async save(user: User): Promise<User> {
    try {
      const saved = await this.typeormUserRepository.save(
        UserMapper.toOrm(user),
      );
      // save ne relit pas les valeurs par défaut de la base (created_at) à la mise à jour
      return UserMapper.toDomain(
        await this.typeormUserRepository.findOneByOrFail({ id: saved.id }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) throw new EmailAlreadyUsedException();
      throw error;
    }
  }

  /**
   * @param id - UUID de l'utilisateur.
   * @throws {UserHasReservationsException} si des réservations bloquent la suppression (ON DELETE RESTRICT).
   */
  async delete(id: string): Promise<void> {
    try {
      await this.typeormUserRepository.delete(id);
    } catch (error) {
      // Réservations liées à l'utilisateur ou à ses salles (ON DELETE RESTRICT)
      if (isForeignKeyViolation(error)) {
        throw new UserHasReservationsException();
      }
      throw error;
    }
  }
}
