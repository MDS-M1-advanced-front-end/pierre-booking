export class RoomDomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoomDomainException';
  }
}

export class RoomNotFoundException extends RoomDomainException {
  constructor(id: string) {
    super(`La salle avec l'id ${id} est introuvable`);
  }
}

// Règle métier non respectée (capacité, prix…)
export class InvalidRoomException extends RoomDomainException {}

export class RoomAccessDeniedException extends RoomDomainException {
  constructor() {
    super(
      'Réservé au gestionnaire propriétaire de la salle et aux administrateurs',
    );
  }
}

export class RoomHasReservationsException extends RoomDomainException {
  constructor() {
    super('La salle a des réservations, elle ne peut pas être supprimée');
  }
}
