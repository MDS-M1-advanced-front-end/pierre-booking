import { User } from '../../domain/entities/user.entity.js';
import { TypeOrmUserEntity } from './typeorm-user.entity.js';

/**
 * Conversion entre l'entité TypeORM et l'entité du domaine.
 */
export class UserMapper {
  /**
   * @param ormEntity - Ligne lue en base.
   * @returns L'utilisateur du domaine.
   */
  static toDomain(ormEntity: TypeOrmUserEntity): User {
    return new User({
      id: ormEntity.id,
      firstName: ormEntity.firstName,
      lastName: ormEntity.lastName,
      email: ormEntity.email,
      passwordHash: ormEntity.passwordHash,
      role: ormEntity.role,
      createdAt: ormEntity.createdAt,
    });
  }

  /**
   * @param domainEntity - Utilisateur du domaine ; sans `id`, une ligne est insérée.
   * @returns L'entité TypeORM à enregistrer.
   */
  static toOrm(domainEntity: User): TypeOrmUserEntity {
    const ormEntity = new TypeOrmUserEntity();
    if (domainEntity.id) ormEntity.id = domainEntity.id;
    ormEntity.firstName = domainEntity.firstName;
    ormEntity.lastName = domainEntity.lastName;
    ormEntity.email = domainEntity.email;
    ormEntity.passwordHash = domainEntity.passwordHash;
    ormEntity.role = domainEntity.role;
    if (domainEntity.createdAt) ormEntity.createdAt = domainEntity.createdAt;
    return ormEntity;
  }
}
