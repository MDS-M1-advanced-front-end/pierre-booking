export interface IssuedToken {
  accessToken: string;
  expiresIn: number;
}

export interface TokenPort {
  issue(userId: string): Promise<IssuedToken>;
  // Identifiant de l'utilisateur, ou null si le jeton est invalide ou expiré
  verify(token: string): Promise<string | null>;
}

export const TOKEN_SERVICE = 'TokenPort';
