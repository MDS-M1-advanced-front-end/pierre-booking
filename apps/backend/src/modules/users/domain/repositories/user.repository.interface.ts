import type { User, UserRole } from '../entities/user.entity.js';

export interface UserRepositoryInterface {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findPage(criteria: {
    role?: UserRole;
    page: number;
    pageSize: number;
  }): Promise<{ items: User[]; total: number }>;
  // EmailAlreadyUsedException si l'e-mail est pris
  save(user: User): Promise<User>;
  // UserHasReservationsException si des réservations lui sont rattachées
  delete(id: string): Promise<void>;
}

export const USER_REPOSITORY = 'UserRepositoryInterface';
