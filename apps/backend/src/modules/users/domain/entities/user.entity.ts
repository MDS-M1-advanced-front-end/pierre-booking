/**
 * Rôle d'un compte. Seul CLIENT est attribué à l'inscription ;
 * GESTIONNAIRE et ADMINISTRATEUR sont donnés par un administrateur.
 */
export enum UserRole {
  CLIENT = 'CLIENT',
  GESTIONNAIRE = 'GESTIONNAIRE',
  ADMINISTRATEUR = 'ADMINISTRATEUR',
}

/**
 * Données d'un utilisateur. `id` et `createdAt` sont absents avant l'enregistrement.
 */
export interface UserProps {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt?: Date;
  passwordChangedAt?: Date;
}

/**
 * Champs du profil qu'un utilisateur peut modifier lui-même (PATCH /auth/me).
 * Un champ absent n'est pas modifié.
 */
export type UserProfileChanges = Partial<
  Pick<UserProps, 'firstName' | 'lastName' | 'email'>
>;

/**
 * Utilisateur du domaine. L'e-mail est toujours stocké normalisé (minuscules, sans espaces).
 */
export class User {
  readonly id?: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  readonly createdAt?: Date;
  /** Instant du dernier changement de mot de passe : les jetons émis avant sont révoqués. */
  passwordChangedAt?: Date;

  /**
   * @param props - Données de l'utilisateur ; l'e-mail est normalisé.
   */
  constructor(props: UserProps) {
    this.id = props.id;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.email = User.normalizeEmail(props.email);
    this.passwordHash = props.passwordHash;
    this.role = props.role;
    this.createdAt = props.createdAt;
    this.passwordChangedAt = props.passwordChangedAt;
  }

  /**
   * Les e-mails sont comparés sans tenir compte de la casse : unicité en base et connexion
   * reposent sur cette forme normalisée.
   * @param email - Adresse saisie.
   * @returns L'adresse en minuscules, sans espaces autour.
   */
  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Indique si l'utilisateur est administrateur (accès à /users et /admin).
   */
  get isAdmin(): boolean {
    return this.role === UserRole.ADMINISTRATEUR;
  }

  /**
   * Applique les modifications du profil ; l'e-mail est normalisé.
   * @param changes - Champs à modifier ; un champ absent est conservé.
   */
  changeProfile(changes: UserProfileChanges): void {
    if (changes.firstName !== undefined) this.firstName = changes.firstName;
    if (changes.lastName !== undefined) this.lastName = changes.lastName;
    if (changes.email !== undefined) {
      this.email = User.normalizeEmail(changes.email);
    }
  }

  /**
   * Change le rôle. Réservé aux administrateurs (PATCH /users/{userId}), contrôlé par le guard.
   * @param role - Nouveau rôle.
   */
  changeRole(role: UserRole): void {
    this.role = role;
  }

  /**
   * Marque un changement de mot de passe : les jetons émis avant cet instant deviennent invalides.
   */
  markPasswordChanged(): void {
    this.passwordChangedAt = new Date();
  }
}
