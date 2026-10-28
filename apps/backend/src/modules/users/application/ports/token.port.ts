/**
 * Jeton d'accès remis à la connexion (AuthResponse du contrat).
 */
export interface IssuedToken {
  accessToken: string;
  expiresIn: number;
}

/**
 * Émission et vérification des jetons d'accès. Implémenté par JwtTokenService.
 */
export interface TokenPort {
  /**
   * Émet un jeton d'accès pour un utilisateur.
   * @param userId - UUID de l'utilisateur.
   * @returns Le jeton et sa durée de vie en secondes.
   */
  issue(userId: string): Promise<IssuedToken>;
  /**
   * Vérifie un jeton d'accès.
   * @param token - Jeton reçu dans l'en-tête Authorization.
   * @returns L'identifiant de l'utilisateur, ou `null` si le jeton est invalide ou expiré.
   */
  verify(token: string): Promise<string | null>;
}

/**
 * Jeton d'injection de TokenPort.
 */
export const TOKEN_SERVICE = 'TokenPort';
