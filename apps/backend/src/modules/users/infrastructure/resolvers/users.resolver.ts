import { UseFilters } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { User as UserGql, UserPage } from '@room-booking/core/graphql';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case';
import { UserRole, type User } from '../../domain/entities/user.entity';
import { CurrentUser, Roles, type AuthUser } from '../auth/auth.decorators';
import {
  ChangeUserRoleArgsDTO,
  DeleteUserArgsDTO,
  UsersArgsDTO,
} from '../dtos/users-graphql.dto';
import { UserExceptionFilter } from '../filters/user-exception.filter';

/**
 * Utilisateur du domaine → type `User` du contrat GraphQL (sans hash ni dates de mot de passe).
 * @param user - Utilisateur relu en base, donc avec `id` et `createdAt`.
 */
const toUserGql = (user: User): UserGql => ({
  id: user.id!,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt!.toISOString(),
});

/**
 * Gestion des utilisateurs de l'espace d'administration (admin.graphql du core), réservée aux
 * administrateurs. Mêmes cas d'usage que les routes /users du REST.
 */
@Resolver()
@Roles(UserRole.ADMINISTRATEUR)
@UseFilters(UserExceptionFilter)
export class UsersResolver {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  /**
   * Query.users : une page d'utilisateurs.
   * @param args - Rôle facultatif et pagination.
   */
  @Query('users')
  async users(@Args() args: UsersArgsDTO): Promise<UserPage> {
    const { items, total } = await this.listUsersUseCase.execute({
      role: args.role ?? undefined,
      page: args.page,
      pageSize: args.pageSize,
    });
    return {
      items: items.map(toUserGql),
      page: args.page,
      pageSize: args.pageSize,
      total,
    };
  }

  /**
   * Mutation.changeUserRole.
   * @param args - Utilisateur et nouveau rôle.
   * @param actor - Administrateur connecté : il ne peut pas changer son propre rôle.
   */
  @Mutation('changeUserRole')
  async changeUserRole(
    @Args() args: ChangeUserRoleArgsDTO,
    @CurrentUser() actor: AuthUser,
  ): Promise<UserGql> {
    const user = await this.updateUserUseCase.execute(
      args.userId,
      { role: args.role },
      actor.id,
    );
    return toUserGql(user);
  }

  /**
   * Mutation.deleteUser.
   * @param args - Utilisateur à supprimer.
   * @param actor - Administrateur connecté : il ne peut pas supprimer son propre compte.
   * @returns L'identifiant de l'utilisateur supprimé.
   */
  @Mutation('deleteUser')
  async deleteUser(
    @Args() args: DeleteUserArgsDTO,
    @CurrentUser() actor: AuthUser,
  ): Promise<string> {
    await this.deleteUserUseCase.execute(args.userId, actor.id);
    return args.userId;
  }
}
