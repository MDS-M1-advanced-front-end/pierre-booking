import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type {
  PasswordCheck,
  PasswordHasherPort,
} from '../../application/ports/password-hasher.port';
import { resolveSecret } from '../../../../common/secrets';

/**
 * Poivre des mots de passe, lu dans PEPPER_SECRET : secret commun à tous les comptes,
 * jamais stocké en base.
 * @returns Le poivre ; `dev-secret` s'il est absent hors production.
 * @throws {Error} en production, si PEPPER_SECRET est absent, trop court ou une valeur de
 * développement (`resolveSecret`), au premier hachage ou à la première vérification.
 */
export function pepperSecret(): string {
  return resolveSecret(
    'PEPPER_SECRET',
    process.env.PEPPER_SECRET,
    'dev-secret',
  );
}

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keyLength: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/**
 * Implémentation de PasswordHasherPort avec scrypt (node:crypto), sans dépendance native.
 * Deux passes : scrypt(mot de passe, sel), puis scrypt("<sel>:<hash>", poivre).
 * Format stocké : "<sel>:<hash final>" en hexadécimal ; le poivre n'est pas stocké.
 * Ancien format, avant le poivre : "<sel>:<première passe>", même longueur, encore accepté par
 * `verify` (`outdated`) pour que les comptes existants puissent se connecter et être re-hachés.
 */
@Injectable()
export class ScryptPasswordHasher implements PasswordHasherPort {
  /**
   * @param password - Mot de passe en clair.
   * @returns Le sel et le hash final (poivré), en hexadécimal.
   */
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const pepper = pepperSecret();
    const saltedhash = await scryptAsync(password, salt, KEY_LENGTH);
    const pepperedAndSaltedHash = await scryptAsync(
      `${salt}:${saltedhash.toString('hex')}`,
      pepper,
      KEY_LENGTH,
    );
    return `${salt}:${pepperedAndSaltedHash.toString('hex')}`;
  }

  /**
   * Refait les deux passes de `hash` avec le sel stocké, puis compare en temps constant
   * (timingSafeEqual). La première passe est aussi comparée au hash stocké, pour l'ancien format
   * sans poivre : aucun calcul de plus, donc le même temps de réponse dans tous les cas.
   * @param password - Mot de passe en clair.
   * @param stored - Valeur stockée "<sel>:<hash>".
   * @returns `valid` (format actuel), `outdated` (ancien format, à re-hacher) ou `invalid`, y
   * compris si la valeur stockée est mal formée.
   */
  async verify(password: string, stored: string): Promise<PasswordCheck> {
    const [salt, hash] = stored.split(':');
    const pepper = pepperSecret();
    // Hash stocké mal formé : longueur hexadécimale inattendue → échec, sans RangeError (500)
    if (!salt || !hash || hash.length !== KEY_LENGTH * 2) return 'invalid';
    const storedHash = Buffer.from(hash, 'hex');
    const saltedCandidate = await scryptAsync(password, salt, KEY_LENGTH);
    const pepperedAndSaltedCandidate = await scryptAsync(
      `${salt}:${saltedCandidate.toString('hex')}`,
      pepper,
      KEY_LENGTH,
    );
    if (timingSafeEqual(pepperedAndSaltedCandidate, storedHash)) return 'valid';
    return timingSafeEqual(saltedCandidate, storedHash)
      ? 'outdated'
      : 'invalid';
  }
}
