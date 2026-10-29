/**
 * Jeton d'accès remis à la connexion (AuthResponse du contrat).
 */
export interface IssuedToken {
  accessToken: string;
  expiresIn: number;
}

/**
 * Contenu vérifié d'un jeton.
 */
export interface TokenPayload {
  /** UUID de l'utilisateur (claim `sub`). */
  userId: string;
  /** Instant d'émission en secondes depuis l'époque Unix (claim `iat`). */
  issuedAt: number;
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
   * @returns Le contenu du jeton, ou `null` si le jeton est invalide ou expiré.
   */
  verify(token: string): Promise<TokenPayload | null>;
  /**
   * Émet un jeton de rafraîchissement, qui ne donne pas accès aux routes protégées.
   * @param userId - UUID de l'utilisateur.
   * @returns Le jeton et sa durée de vie en secondes.
   */
  issueRefresh(userId: string): Promise<IssuedToken>;
  /**
   * Vérifie un jeton de rafraîchissement.
   * @param token - Jeton reçu dans le corps de POST /auth/refresh.
   * @returns Le contenu du jeton, ou `null` si le jeton est invalide ou expiré.
   */
  verifyRefresh(token: string): Promise<TokenPayload | null>;
}

/**
 * Jeton d'injection de TokenPort.
 */
export const TOKEN_SERVICE = 'TokenPort';
