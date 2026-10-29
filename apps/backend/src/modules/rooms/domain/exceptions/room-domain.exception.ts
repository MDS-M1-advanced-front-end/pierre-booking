/**
 * Exception du domaine des salles. Traduite en réponse HTTP par DomainExceptionFilter.
 */
export class RoomDomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoomDomainException';
  }
}

/** La salle n'existe pas, ou n'est pas visible par l'acteur (404). */
export class RoomNotFoundException extends RoomDomainException {
  constructor(id: string) {
    super(`La salle avec l'id ${id} est introuvable`);
  }
}

/** Règle métier non respectée : capacité, prix, créneaux (400). */
export class InvalidRoomException extends RoomDomainException {}

/** L'acteur n'est ni le gestionnaire propriétaire ni un administrateur (403). */
export class RoomAccessDeniedException extends RoomDomainException {
  constructor() {
    super(
      'Réservé au gestionnaire propriétaire de la salle et aux administrateurs',
    );
  }
}

/** Suppression refusée : des réservations sont rattachées à la salle (409). */
export class RoomHasReservationsException extends RoomDomainException {
  constructor() {
    super('La salle a des réservations, elle ne peut pas être supprimée');
  }
}
