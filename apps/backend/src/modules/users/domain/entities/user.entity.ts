export enum UserRole {
  CLIENT = 'CLIENT',
  GESTIONNAIRE = 'GESTIONNAIRE',
  ADMINISTRATEUR = 'ADMINISTRATEUR',
}

export interface UserProps {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt?: Date;
}

export type UserProfileChanges = Partial<
  Pick<UserProps, 'firstName' | 'lastName' | 'email'>
>;

export class User {
  readonly id?: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  readonly createdAt?: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.email = User.normalizeEmail(props.email);
    this.passwordHash = props.passwordHash;
    this.role = props.role;
    this.createdAt = props.createdAt;
  }

  // Les e-mails sont comparés sans tenir compte de la casse
  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  get isAdmin(): boolean {
    return this.role === UserRole.ADMINISTRATEUR;
  }

  changeProfile(changes: UserProfileChanges): void {
    if (changes.firstName !== undefined) this.firstName = changes.firstName;
    if (changes.lastName !== undefined) this.lastName = changes.lastName;
    if (changes.email !== undefined) {
      this.email = User.normalizeEmail(changes.email);
    }
  }

  changeRole(role: UserRole): void {
    this.role = role;
  }
}
