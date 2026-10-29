import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { PasswordHasherPort } from '../../application/ports/password-hasher.port';
import { resolveSecret } from '../../../../common/secrets';

/**
 * Poivre des mots de passe, lu dans PEPPER_SECRET : secret commun à tous les comptes,
 * jamais stocké en base.
 * @returns Le poivre ; `dev-secret` si NODE_ENV vaut `development`.
 * @throws {Error} sans PEPPER_SECRET hors `development`, au premier hachage ou à la première
 * vérification (pas au démarrage).
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
   * (timingSafeEqual).
   * @param password - Mot de passe en clair.
   * @param stored - Valeur stockée "<sel>:<hash final>".
   * @returns `true` si le mot de passe correspond ; `false` si un élément manque, ou pour un
   * hash créé sans poivre.
   * @throws {RangeError} si le hash stocké n'a pas la longueur attendue (timingSafeEqual).
   */
  async verify(password: string, stored: string): Promise<boolean> {
    const [salt, hash] = stored.split(':');
    const pepper = pepperSecret();
    // Hash stocké mal formé : longueur hexadécimale inattendue → échec, sans RangeError (500)
    if (!salt || !hash || hash.length !== KEY_LENGTH * 2) return false;
    const saltedCandidate = await scryptAsync(password, salt, KEY_LENGTH);
    const PepperedAndSaltedCandidate = await scryptAsync(
      `${salt}:${saltedCandidate.toString('hex')}`,
      pepper,
      KEY_LENGTH,
    );
    return timingSafeEqual(
      PepperedAndSaltedCandidate,
      Buffer.from(hash, 'hex'),
    );
  }
}
