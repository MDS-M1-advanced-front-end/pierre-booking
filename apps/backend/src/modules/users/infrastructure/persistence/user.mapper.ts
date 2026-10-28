import { User } from '../../domain/entities/user.entity.js';
import { TypeOrmUserEntity } from './typeorm-user.entity.js';

export class UserMapper {
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
