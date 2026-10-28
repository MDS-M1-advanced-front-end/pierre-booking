import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
} from '@nestjs/common';
import { NonEmptyBodyPipe } from '../../../../common/non-empty-body.pipe.js';
import { toSkipTake } from '../../../../common/pagination.dto.js';
import {
  CurrentUser,
  Public,
  Roles,
  type AuthUser,
} from '../../../users/infrastructure/auth/auth.decorators.js';
import { UserRole } from '../../../users/domain/entities/user.entity.js';
import { GetRoomAvailabilityUseCase } from '../../application/use-cases/get-room-availability.use-case.js';
import { SetRoomAvailabilityUseCase } from '../../application/use-cases/set-room-availability.use-case.js';
import { CreateRoomUseCase } from '../../application/use-cases/create-room.use-case.js';
import { DeleteRoomUseCase } from '../../application/use-cases/delete-room.use-case.js';
import { GetRoomUseCase } from '../../application/use-cases/get-room.use-case.js';
import { GetRoomsUseCase } from '../../application/use-cases/get-rooms.use-case.js';
import { UpdateRoomUseCase } from '../../application/use-cases/update-room.use-case.js';
import {
  RoomStatus,
  type RoomActor,
} from '../../domain/entities/room.entity.js';
import { toAvailabilitySlotDTO, toRoomDTO } from '../dtos/room-dto.mapper.js';
import {
  AvailabilityQueryDTO,
  AvailabilitySlotDTO,
  CreateRoomDTO,
  PaginatedRoomsDTO,
  RoomDTO,
  RoomsQueryDTO,
  UpdateAvailabilityDTO,
  UpdateRoomDTO,
} from '../dtos/rooms.dto.js';
import { DomainExceptionFilter } from '../filters/global-exception.filter.js';

// Utilisateur authentifié → acteur du domaine
function toActor(user: AuthUser): RoomActor;
function toActor(user?: AuthUser): RoomActor | undefined;
function toActor(user?: AuthUser): RoomActor | undefined {
  return (
    user && { id: user.id, isAdmin: user.role === UserRole.ADMINISTRATEUR }
  );
}

@Controller('rooms')
@UseFilters(DomainExceptionFilter)
export class RoomsController {
  constructor(
    private readonly createRoomUseCase: CreateRoomUseCase,
    private readonly getRoomsUseCase: GetRoomsUseCase,
    private readonly getRoomUseCase: GetRoomUseCase,
    private readonly updateRoomUseCase: UpdateRoomUseCase,
    private readonly deleteRoomUseCase: DeleteRoomUseCase,
    private readonly getRoomAvailabilityUseCase: GetRoomAvailabilityUseCase,
    private readonly setRoomAvailabilityUseCase: SetRoomAvailabilityUseCase,
  ) {}

  @Public()
  @Get()
  async findAll(
    @Query() query: RoomsQueryDTO,
    @CurrentUser() user?: AuthUser,
  ): Promise<PaginatedRoomsDTO> {
    const { page, pageSize } = toSkipTake(query);
    const { items, total } = await this.getRoomsUseCase.execute(
      {
        search: query.search,
        location: query.location,
        capacityMin: query.capacityMin,
        capacityMax: query.capacityMax,
        date: query.date,
        startTime: query.startTime,
        endTime: query.endTime,
        available: query.available,
        page,
        pageSize,
      },
      toActor(user),
    );
    return { items: items.map(toRoomDTO), page, pageSize, total };
  }

  @Post()
  @Roles(UserRole.GESTIONNAIRE, UserRole.ADMINISTRATEUR)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateRoomDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<RoomDTO> {
    const room = await this.createRoomUseCase.execute(
      dto.name,
      dto.description ?? null,
      dto.capacity,
      dto.location,
      dto.pricePerHour,
      dto.equipment ?? [],
      RoomStatus.ACTIVE,
      dto.imageUrl ?? null,
      user.id,
    );

    return toRoomDTO(room);
  }

  @Public()
  @Get(':roomId')
  async findOne(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<RoomDTO> {
    return toRoomDTO(await this.getRoomUseCase.execute(roomId, toActor(user)));
  }

  @Patch(':roomId')
  async update(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body(NonEmptyBodyPipe) dto: UpdateRoomDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<RoomDTO> {
    const room = await this.updateRoomUseCase.execute(
      roomId,
      dto,
      toActor(user),
    );
    return toRoomDTO(room);
  }

  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.deleteRoomUseCase.execute(roomId, toActor(user));
  }

  @Public()
  @Get(':roomId/availability')
  async getAvailability(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: AvailabilityQueryDTO,
  ): Promise<AvailabilitySlotDTO[]> {
    const slots = await this.getRoomAvailabilityUseCase.execute(
      roomId,
      query.date,
      query.startTime,
      query.endTime,
    );
    return slots.map(({ slot, available }) =>
      toAvailabilitySlotDTO(slot, available),
    );
  }

  @Put(':roomId/availability')
  async setAvailability(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateAvailabilityDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<AvailabilitySlotDTO[]> {
    const slots = await this.setRoomAvailabilityUseCase.execute(
      roomId,
      dto.date,
      dto.slots,
      toActor(user),
    );
    return slots.map((slot) => toAvailabilitySlotDTO(slot));
  }
}
