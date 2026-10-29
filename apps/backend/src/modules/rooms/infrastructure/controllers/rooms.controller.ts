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
import { NonEmptyBodyPipe } from '../../../../common/non-empty-body.pipe';
import { toSkipTake } from '../../../../common/pagination.dto';
import {
  CurrentUser,
  Public,
  Roles,
  type AuthUser,
} from '../../../users/infrastructure/auth/auth.decorators';
import { UserRole } from '../../../users/domain/entities/user.entity';
import { GetRoomAvailabilityUseCase } from '../../application/use-cases/get-room-availability.use-case';
import { SetRoomAvailabilityUseCase } from '../../application/use-cases/set-room-availability.use-case';
import { CreateRoomUseCase } from '../../application/use-cases/create-room.use-case';
import { DeleteRoomUseCase } from '../../application/use-cases/delete-room.use-case';
import { GetRoomUseCase } from '../../application/use-cases/get-room.use-case';
import { GetRoomsUseCase } from '../../application/use-cases/get-rooms.use-case';
import { UpdateRoomUseCase } from '../../application/use-cases/update-room.use-case';
import { RoomStatus, type RoomActor } from '../../domain/entities/room.entity';
import { toAvailabilitySlotDTO, toRoomDTO } from '../dtos/room-dto.mapper';
import {
  AvailabilityQueryDTO,
  AvailabilitySlotDTO,
  CreateRoomDTO,
  PaginatedRoomsDTO,
  RoomDTO,
  RoomsQueryDTO,
  UpdateAvailabilityDTO,
  UpdateRoomDTO,
} from '../dtos/rooms.dto';
import { DomainExceptionFilter } from '../filters/global-exception.filter';

/**
 * Utilisateur authentifié → acteur du domaine.
 * @param user - Utilisateur de la requête, absent sur une route publique sans jeton.
 * @returns L'acteur, ou undefined pour un visiteur.
 */
function toActor(user: AuthUser): RoomActor;
function toActor(user?: AuthUser): RoomActor | undefined;
function toActor(user?: AuthUser): RoomActor | undefined {
  return (
    user && { id: user.id, isAdmin: user.role === UserRole.ADMINISTRATEUR }
  );
}

/**
 * Routes /rooms et /rooms/{roomId}/availability. Les exceptions du domaine sont traduites en
 * réponses HTTP par DomainExceptionFilter.
 */
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

  /**
   * GET /rooms (public) : recherche paginée des salles.
   * @param query - Filtres et pagination.
   * @param user - Utilisateur connecté, s'il a envoyé un jeton (voit alors ses salles inactives).
   * @returns Une page de salles.
   */
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

  /**
   * POST /rooms (gestionnaires et administrateurs) : ajoute une salle, active, dont l'utilisateur
   * connecté est le propriétaire.
   * @param dto - Salle à créer.
   * @param user - Utilisateur connecté.
   * @returns La salle créée.
   */
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

  /**
   * GET /rooms/{roomId} (public) : détails d'une salle.
   * @param roomId - Identifiant de la salle.
   * @param user - Utilisateur connecté, s'il a envoyé un jeton.
   * @returns La salle ; 404 si elle n'existe pas ou est inactive pour cet utilisateur.
   */
  @Public()
  @Get(':roomId')
  async findOne(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<RoomDTO> {
    return toRoomDTO(await this.getRoomUseCase.execute(roomId, toActor(user)));
  }

  /**
   * PATCH /rooms/{roomId} : modification partielle, par le propriétaire ou un administrateur.
   * @param roomId - Identifiant de la salle.
   * @param dto - Champs à modifier (au moins un).
   * @param user - Utilisateur connecté.
   * @returns La salle modifiée.
   */
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

  /**
   * DELETE /rooms/{roomId} : suppression par le propriétaire ou un administrateur ; 409 si la
   * salle a des réservations.
   * @param roomId - Identifiant de la salle.
   * @param user - Utilisateur connecté.
   */
  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.deleteRoomUseCase.execute(roomId, toActor(user));
  }

  /**
   * GET /rooms/{roomId}/availability (public) : créneaux d'une journée et leur disponibilité.
   * @param roomId - Identifiant de la salle.
   * @param query - Jour et plage horaire facultative.
   * @returns Les créneaux de la journée.
   */
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

  /**
   * PUT /rooms/{roomId}/availability : remplace les créneaux d'une journée, par le propriétaire
   * ou un administrateur.
   * @param roomId - Identifiant de la salle.
   * @param dto - Jour et nouveaux créneaux.
   * @param user - Utilisateur connecté.
   * @returns Les créneaux enregistrés.
   */
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
