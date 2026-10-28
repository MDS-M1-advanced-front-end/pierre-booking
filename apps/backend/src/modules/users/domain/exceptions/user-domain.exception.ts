/**
 * Erreur métier du module users. Traduite en réponse HTTP par UserExceptionFilter.
 */
export class UserDomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserDomainException';
  }
}

/**
 * Utilisateur introuvable (404).
 */
export class UserNotFoundException extends UserDomainException {
  constructor() {
    super('Utilisateur introuvable');
  }
}

/**
 * Adresse e-mail déjà prise par un autre compte (409).
 */
export class EmailAlreadyUsedException extends UserDomainException {
  constructor() {
    super('Adresse e-mail déjà utilisée');
  }
}

/**
 * E-mail inconnu ou mot de passe faux à la connexion (401). Même message dans les deux cas,
 * pour ne pas révéler quels e-mails ont un compte.
 */
export class InvalidCredentialsException extends UserDomainException {
  constructor() {
    super('Identifiants invalides');
  }
}

/**
 * Mot de passe actuel incorrect au changement de mot de passe (400, et non 401 : le front
 * ne doit pas déconnecter l'utilisateur).
 */
export class WrongCurrentPasswordException extends UserDomainException {
  constructor() {
    super('Mot de passe actuel incorrect');
  }
}

/**
 * Suppression refusée : des réservations sont rattachées à l'utilisateur ou à ses salles (409).
 */
export class UserHasReservationsException extends UserDomainException {
  constructor() {
    super("L'utilisateur a des réservations, il ne peut pas être supprimé");
  }
}
