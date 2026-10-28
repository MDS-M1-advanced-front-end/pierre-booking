export class UserDomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserDomainException';
  }
}

export class UserNotFoundException extends UserDomainException {
  constructor() {
    super('Utilisateur introuvable');
  }
}

export class EmailAlreadyUsedException extends UserDomainException {
  constructor() {
    super('Adresse e-mail déjà utilisée');
  }
}

export class InvalidCredentialsException extends UserDomainException {
  constructor() {
    super('Identifiants invalides');
  }
}

export class WrongCurrentPasswordException extends UserDomainException {
  constructor() {
    super('Mot de passe actuel incorrect');
  }
}

export class UserHasReservationsException extends UserDomainException {
  constructor() {
    super("L'utilisateur a des réservations, il ne peut pas être supprimé");
  }
}
