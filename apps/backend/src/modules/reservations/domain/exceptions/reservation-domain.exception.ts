export class ReservationDomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReservationDomainException';
  }
}

// 404
export class ReservationNotFoundException extends ReservationDomainException {
  constructor(message = 'Réservation introuvable') {
    super(message);
  }
}

// 403
export class ReservationAccessDeniedException extends ReservationDomainException {
  constructor() {
    super('Accès interdit.');
  }
}

// 400 : règle de saisie non respectée (créneau, capacité…)
export class InvalidReservationException extends ReservationDomainException {}

// 409 : conflit avec l'état actuel (statut, créneau pris, salle inactive, paiement existant)
export class ReservationConflictException extends ReservationDomainException {}
