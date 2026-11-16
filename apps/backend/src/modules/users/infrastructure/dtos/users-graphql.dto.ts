// Les arguments facultatifs du schéma sont typés `T | null` (avoidOptionals du codegen) ; à
// l'exécution, un argument omis est absent : les resolvers le lisent avec `?? undefined`.
import type {
  MutationChangeUserRoleArgs,
  MutationDeleteUserArgs,
  QueryUsersArgs,
} from '@room-booking/core/graphql';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { UserRole } from '../../domain/entities/user.entity';

// Arguments des opérations GraphQL sur les utilisateurs (admin.graphql). GraphQL vérifie déjà les
// types et les enums ; les décorateurs bornent la pagination et refusent un identifiant qui n'est
// pas un UUID (PostgreSQL lèverait une erreur 500). Valeurs par défaut : dans le schéma.

/** Arguments de `Query.users`. */
export class UsersArgsDTO implements QueryUsersArgs {
  @IsEnum(UserRole)
  @IsOptional()
  role: UserRole | null;

  @IsInt()
  @Min(1)
  page: number;

  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number;
}

/** Arguments de `Mutation.changeUserRole`. */
export class ChangeUserRoleArgsDTO implements MutationChangeUserRoleArgs {
  @IsUUID()
  userId: string;

  @IsEnum(UserRole)
  role: UserRole;
}

/** Arguments de `Mutation.deleteUser`. */
export class DeleteUserArgsDTO implements MutationDeleteUserArgs {
  @IsUUID()
  userId: string;
}
