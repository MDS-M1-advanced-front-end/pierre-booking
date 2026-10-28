import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmRoomEntity as Room } from '../../modules/rooms/infrastructure/persistence/typeorm-room.entity.js';

// Les cas d'usage des salles sont dans modules/rooms. Il ne reste ici que la lecture d'une salle
// pour ReservationsService, en attendant la migration des réservations.
@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
  ) {}

  async getOrFail(roomId: string): Promise<Room> {
    const room = await this.rooms.findOneBy({ id: roomId });
    if (!room) throw new NotFoundException('Salle introuvable');
    return room;
  }
}
