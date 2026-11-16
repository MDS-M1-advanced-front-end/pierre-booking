import { UseFilters } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type {
  ReservationPage,
  ReservationRequest,
} from '@room-booking/core/graphql';
import { UserRole } from '../../../users/domain/entities/user.entity';
import {
  CurrentUser,
  Roles,
  type AuthUser,
} from '../../../users/infrastructure/auth/auth.decorators';
import { BrowseReservationsUseCase } from '../../application/use-cases/browse-reservations.use-case';
import { CancelReservationUseCase } from '../../application/use-cases/cancel-reservation.use-case';
import { ConfirmReservationUseCase } from '../../application/use-cases/confirm-reservation.use-case';
import { RejectReservationUseCase } from '../../application/use-cases/reject-reservation.use-case';
import { toActor } from '../controllers/actor';
import {
  RejectReservationArgsDTO,
  ReservationIdArgsDTO,
  ReservationsArgsDTO,
} from '../dtos/admin-reservations.dto';
import { ReservationExceptionFilter } from '../filters/reservation-exception.filter';
import { toReservationRequest } from './reservation-request.mapper';

/**
 * Réservations de l'espace d'administration (admin.graphql du core) : liste de toutes les
 * réservations et actions. Les actions reprennent les cas d'usage du REST, avec les mêmes règles
 * d'accès, puis relisent la réservation avec sa salle et son demandeur.
 */
@Resolver()
@UseFilters(ReservationExceptionFilter)
export class AdminReservationsResolver {
  constructor(
    private readonly browseReservationsUseCase: BrowseReservationsUseCase,
    private readonly confirmReservationUseCase: ConfirmReservationUseCase,
    private readonly rejectReservationUseCase: RejectReservationUseCase,
    private readonly cancelReservationUseCase: CancelReservationUseCase,
  ) {}

  /**
   * Query.reservations : toutes les réservations, filtrables.
   * @param args - Filtres facultatifs et pagination.
   */
  @Query('reservations')
  @Roles(UserRole.ADMINISTRATEUR)
  async reservations(
    @Args() args: ReservationsArgsDTO,
  ): Promise<ReservationPage> {
    const { items, total } = await this.browseReservationsUseCase.page({
      status: args.filter?.status ?? undefined,
      roomId: args.filter?.roomId ?? undefined,
      userId: args.filter?.userId ?? undefined,
      page: args.page,
      pageSize: args.pageSize,
    });
    return {
      items: items.map(toReservationRequest),
      page: args.page,
      pageSize: args.pageSize,
      total,
    };
  }

  /**
   * Mutation.confirmReservation : gestionnaire de la salle ou administrateur.
   * @param args - Réservation à confirmer.
   * @param user - Utilisateur connecté.
   */
  @Mutation('confirmReservation')
  @Roles(UserRole.GESTIONNAIRE, UserRole.ADMINISTRATEUR)
  async confirmReservation(
    @Args() args: ReservationIdArgsDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationRequest> {
    await this.confirmReservationUseCase.execute(
      args.reservationId,
      toActor(user),
    );
    return this.reload(args.reservationId);
  }

  /**
   * Mutation.rejectReservation : gestionnaire de la salle ou administrateur.
   * @param args - Réservation à refuser et motif facultatif.
   * @param user - Utilisateur connecté.
   */
  @Mutation('rejectReservation')
  @Roles(UserRole.GESTIONNAIRE, UserRole.ADMINISTRATEUR)
  async rejectReservation(
    @Args() args: RejectReservationArgsDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationRequest> {
    await this.rejectReservationUseCase.execute(
      args.reservationId,
      args.reason || undefined,
      toActor(user),
    );
    return this.reload(args.reservationId);
  }

  /**
   * Mutation.cancelReservation : administrateurs (le cas d'usage accepte aussi l'auteur, qui
   * passe par le REST).
   * @param args - Réservation à annuler.
   * @param user - Administrateur connecté.
   */
  @Mutation('cancelReservation')
  @Roles(UserRole.ADMINISTRATEUR)
  async cancelReservation(
    @Args() args: ReservationIdArgsDTO,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationRequest> {
    await this.cancelReservationUseCase.execute(
      args.reservationId,
      toActor(user),
    );
    return this.reload(args.reservationId);
  }

  /** Réservation relue avec sa salle et son demandeur, au format du contrat. */
  private async reload(reservationId: string): Promise<ReservationRequest> {
    return toReservationRequest(
      await this.browseReservationsUseCase.byId(reservationId),
    );
  }
}
