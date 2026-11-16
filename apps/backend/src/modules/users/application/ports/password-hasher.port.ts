/**
 * Résultat d'une vérification : `valid`, `invalid`, ou `outdated` si le mot de passe correspond à
 * un hash d'un ancien format (sans poivre), à re-hacher par l'appelant.
 */
export type PasswordCheck = 'valid' | 'outdated' | 'invalid';

/**
 * Hachage des mots de passe. Implémenté par ScryptPasswordHasher.
 */
export interface PasswordHasherPort {
  /**
   * Hache un mot de passe avec un sel aléatoire.
   * @param password - Mot de passe en clair.
   * @returns Le hash à stocker.
   */
  hash(password: string): Promise<string>;
  /**
   * Vérifie un mot de passe contre un hash stocké.
   * @param password - Mot de passe en clair.
   * @param hash - Hash stocké en base.
   * @returns `valid` ou `outdated` si le mot de passe correspond, `invalid` sinon.
   */
  verify(password: string, hash: string): Promise<PasswordCheck>;
}

/**
 * Jeton d'injection de PasswordHasherPort.
 */
export const PASSWORD_HASHER = 'PasswordHasherPort';
