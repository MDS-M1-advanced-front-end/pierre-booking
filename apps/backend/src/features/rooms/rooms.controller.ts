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
} from '@nestjs/common';
import { NonEmptyBodyPipe } from '../../common/non-empty-body.pipe.js';
import {
  CurrentUser,
  Public,
  Roles,
  type AuthUser,
} from '../auth/auth.decorators.js';
import { UserRole } from '../users/users.dto.js';
import { AvailabilityService } from './availability.service.js';
import {
  AvailabilityQueryDTO,
  AvailabilitySlotDTO,
  CreateRoomDTO,
  PaginatedRoomsDTO,
  RoomDTO,
  RoomsQueryDTO,
  UpdateAvailabilityDTO,
  UpdateRoomDTO,
} from './rooms.dto.js';
import { RoomsService } from './rooms.service.js';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Public()
  @Get()
  findAll(
    @Query() query: RoomsQueryDTO,
    @CurrentUser() user?: AuthUser,
  ): Promise<PaginatedRoomsDTO> {
    return this.roomsService.findAll(query, user);
  }

  @Post()
  @Roles(UserRole.GESTIONNAIRE, UserRole.ADMINISTRATEUR)
  create(
    @Body() body: CreateRoomDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<RoomDTO> {
    return this.roomsService.create(body, user);
  }

  @Public()
  @Get(':roomId')
  findOne(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<RoomDTO> {
    return this.roomsService.findOne(roomId, user);
  }

  @Patch(':roomId')
  update(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body(NonEmptyBodyPipe) body: UpdateRoomDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<RoomDTO> {
    return this.roomsService.update(roomId, body, user);
  }

  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.roomsService.remove(roomId, user);
  }

  @Public()
  @Get(':roomId/availability')
  getAvailability(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: AvailabilityQueryDTO,
  ): Promise<AvailabilitySlotDTO[]> {
    return this.availabilityService.find(roomId, query);
  }

  @Put(':roomId/availability')
  setAvailability(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: UpdateAvailabilityDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<AvailabilitySlotDTO[]> {
    return this.availabilityService.replace(roomId, body, user);
  }
}
