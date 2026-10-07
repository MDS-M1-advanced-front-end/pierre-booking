import type { Room } from '@room-booking/core';
import { mockRooms } from './rooms.mock';

// TODO: brancher sur searchRooms() de core
export const getRooms = async (): Promise<Room[]> => {
  return Promise.resolve(mockRooms);
};
