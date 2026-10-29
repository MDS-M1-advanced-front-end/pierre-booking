/**
 * Jeton d'accès remis à la connexion (AuthResponse du contrat).
 */
export interface IssuedToken {
  accessToken: string;
  expiresIn: number;
}

/**
 * Émission et vérification des jetons d'accès (courts) et de rafraîchissement (longs).
 * Implémenté par JwtTokenService.
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
  /**
   * Émet un jeton de rafraîchissement, qui ne donne pas accès aux routes protégées.
   * @param userId - UUID de l'utilisateur.
   * @returns Le jeton et sa durée de vie en secondes.
   */
  issueRefresh(userId: string): Promise<IssuedToken>;
  /**
   * Vérifie un jeton de rafraîchissement.
   * @param token - Jeton reçu dans le corps de POST /auth/refresh.
   * @returns L'identifiant de l'utilisateur, ou `null` si le jeton est invalide ou expiré.
   */
  verifyRefresh(token: string): Promise<string | null>;
}

/**
 * Jeton d'injection de TokenPort.
 */
export const TOKEN_SERVICE = 'TokenPort';
