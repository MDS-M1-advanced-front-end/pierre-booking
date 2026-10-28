import { Room } from '../../domain/entities/room.entity.js';
import { TypeOrmRoomEntity } from './typeorm-room.entity.js';

/** Conversion entre l'entité TypeORM et l'entité du domaine. */
export class RoomMapper {
  /**
   * Ligne de la table rooms → salle du domaine.
   * @param ormEntity - Entité lue par TypeORM.
   * @returns La salle du domaine.
   */
  static toDomain(ormEntity: TypeOrmRoomEntity): Room {
    return new Room(
      ormEntity.id,
      ormEntity.name,
      ormEntity.description,
      ormEntity.capacity,
      ormEntity.location,
      ormEntity.pricePerHour,
      ormEntity.equipment,
      ormEntity.status,
      ormEntity.imageUrl,
      ormEntity.ownerId,
      ormEntity.createdAt,
    );
  }

  /**
   * Salle du domaine → entité TypeORM à enregistrer.
   * @param domainEntity - Salle du domaine ; sans identifiant, elle sera insérée.
   * @returns L'entité TypeORM.
   */
  static toOrm(domainEntity: Room): TypeOrmRoomEntity {
    const ormEntity = new TypeOrmRoomEntity();
    // Sans id : insertion ; avec id : mise à jour
    if (domainEntity.id) ormEntity.id = domainEntity.id;
    ormEntity.name = domainEntity.name;
    ormEntity.description = domainEntity.description;
    ormEntity.capacity = domainEntity.capacity;
    ormEntity.location = domainEntity.location;
    ormEntity.pricePerHour = domainEntity.pricePerHour;
    ormEntity.equipment = domainEntity.equipment;
    ormEntity.status = domainEntity.status;
    ormEntity.imageUrl = domainEntity.imageUrl;
    ormEntity.ownerId = domainEntity.ownerId;
    if (domainEntity.createdAt) ormEntity.createdAt = domainEntity.createdAt;
    return ormEntity;
  }
}
