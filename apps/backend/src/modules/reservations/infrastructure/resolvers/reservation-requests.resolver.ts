import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import type { ReservationRequest } from '@room-booking/core/graphql';
import { UserRole } from '../../../users/domain/entities/user.entity';
import {
  CurrentUser,
  Roles,
  type AuthUser,
} from '../../../users/infrastructure/auth/auth.decorators';
import { ListReservationRequestsUseCase } from '../../application/use-cases/list-reservation-requests.use-case';
import type { ReservationActor } from '../../domain/entities/reservation.entity';
import { toActor } from '../controllers/actor';
import { ReservationRequestsArgsDTO } from '../dtos/reservation-requests.dto';
import { toReservationRequest } from './reservation-request.mapper';

/** Objet `ReservationRequests` avant ses champs calculés : l'utilisateur, transmis à chaque champ. */
interface RequestsScope {
  actor: ReservationActor;
}

/**
 * Demandes de réservation de l'écran « Demandes » (admin.graphql du core), pour les gestionnaires
 * (leurs salles) et les administrateurs (toutes les salles). Comme pour `DashboardResolver`,
 * AuthGuard contrôle @Roles sur la requête ; les champs ne sont atteignables qu'à travers elle.
 */
@Resolver('ReservationRequests')
@Roles(UserRole.GESTIONNAIRE, UserRole.ADMINISTRATEUR)
export class ReservationRequestsResolver {
  constructor(
    private readonly listReservationRequestsUseCase: ListReservationRequestsUseCase,
  ) {}

  /** Query.reservationRequests : ne lit rien, chaque liste demandée est lue ensuite. */
  @Query('reservationRequests')
  reservationRequests(@CurrentUser() user: AuthUser): RequestsScope {
    return { actor: toActor(user) };
  }

  @ResolveField('pending')
  async pending(
    @Parent() { actor }: RequestsScope,
    @Args() args: ReservationRequestsArgsDTO,
  ): Promise<ReservationRequest[]> {
    const views = await this.listReservationRequestsUseCase.pending(
      actor,
      args.limit,
    );
    return views.map(toReservationRequest);
  }

  @ResolveField('handled')
  async handled(
    @Parent() { actor }: RequestsScope,
    @Args() args: ReservationRequestsArgsDTO,
  ): Promise<ReservationRequest[]> {
    const views = await this.listReservationRequestsUseCase.handled(
      actor,
      args.limit,
    );
    return views.map(toReservationRequest);
  }
}
