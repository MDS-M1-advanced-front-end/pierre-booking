/**
 * Erreur du domaine des réservations. Traduite en réponse HTTP par `ReservationExceptionFilter`,
 * selon la sous-classe.
 */
export class ReservationDomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReservationDomainException';
  }
}

/** Réservation, salle ou paiement introuvable (404). */
export class ReservationNotFoundException extends ReservationDomainException {
  /**
   * @param message - Ce qui est introuvable (« Réservation introuvable » par défaut).
   */
  constructor(message = 'Réservation introuvable') {
    super(message);
  }
}

/** L'utilisateur n'a pas le droit d'agir sur cette réservation ou ce paiement (403). */
export class ReservationAccessDeniedException extends ReservationDomainException {
  constructor() {
    super('Accès interdit.');
  }
}

/** Règle de saisie non respectée : créneau, capacité… (400). */
export class InvalidReservationException extends ReservationDomainException {}

/** Conflit avec l'état actuel : statut, créneau pris, salle inactive, paiement existant (409). */
export class ReservationConflictException extends ReservationDomainException {}
