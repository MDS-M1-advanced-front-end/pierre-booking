// Résolution des secrets (JWT, poivre). Hors production, un secret absent retombe sur une valeur
// de développement ; en production, le secret est obligatoire, doit être long et ne peut pas être
// une valeur de développement connue (sinon le back refuse de démarrer / de signer).
const WEAK_SECRETS = new Set([
  'dev-secret',
  'dev-refresh-secret',
  'changeme',
  'secret',
  'password',
]);

const MIN_SECRET_LENGTH = 16;

const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Renvoie le secret à utiliser pour `name`.
 * @param name - Nom de la variable d'environnement (pour les messages d'erreur).
 * @param value - Valeur lue dans l'environnement.
 * @param devFallback - Valeur de repli hors production.
 * @returns Le secret.
 * @throws {Error} En production : variable absente, trop courte, ou valeur de développement connue.
 */
export function resolveSecret(
  name: string,
  value: string | undefined,
  devFallback: string,
): string {
  if (value) {
    if (isProduction() && WEAK_SECRETS.has(value)) {
      throw new Error(
        `${name} ne peut pas être une valeur de développement connue en production`,
      );
    }
    if (isProduction() && value.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `${name} doit faire au moins ${MIN_SECRET_LENGTH} caractères en production`,
      );
    }
    return value;
  }
  if (isProduction()) {
    throw new Error(`${name} est obligatoire en production`);
  }
  return devFallback;
}
