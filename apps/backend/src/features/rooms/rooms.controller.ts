import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
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

@Controller('rooms')
export class RoomsController {
  @Get()
  findAll(@Query() query: RoomsQueryDTO): PaginatedRoomsDTO {
    throw new NotImplementedException();
  }

  @Post()
  create(@Body() body: CreateRoomDTO): RoomDTO {
    throw new NotImplementedException();
  }

  @Get(':roomId')
  findOne(@Param('roomId', ParseUUIDPipe) roomId: string): RoomDTO {
    throw new NotImplementedException();
  }

  @Patch(':roomId')
  update(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: UpdateRoomDTO,
  ): RoomDTO {
    throw new NotImplementedException();
  }

  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('roomId', ParseUUIDPipe) roomId: string): void {
    throw new NotImplementedException();
  }

  @Get(':roomId/availability')
  getAvailability(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: AvailabilityQueryDTO,
  ): AvailabilitySlotDTO[] {
    throw new NotImplementedException();
  }

  @Put(':roomId/availability')
  setAvailability(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: UpdateAvailabilityDTO,
  ): AvailabilitySlotDTO[] {
    throw new NotImplementedException();
  }
}
