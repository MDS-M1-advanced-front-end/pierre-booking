/**
 * Un jeton est révoqué si son instant d'émission précède le dernier changement de mot de passe.
 * @param issuedAt - Instant d'émission du jeton, en secondes (claim `iat`).
 * @param passwordChangedAt - Instant du dernier changement de mot de passe, ou undefined.
 * @returns true si le jeton doit être rejeté.
 */
export function isRevoked(issuedAt: number, passwordChangedAt?: Date): boolean {
  if (!passwordChangedAt) return false;
  // iat est en secondes (arrondi à la seconde inférieure) : on compare à la même granularité.
  return issuedAt < Math.floor(passwordChangedAt.getTime() / 1000);
}
