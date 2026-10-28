import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { PasswordHasherPort } from '../../application/ports/password-hasher.port.js';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keyLength: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/**
 * Implémentation de PasswordHasherPort avec scrypt (node:crypto), sans dépendance native.
 * Format stocké : "<sel>:<hash>" en hexadécimal.
 */
@Injectable()
export class ScryptPasswordHasher implements PasswordHasherPort {
  /**
   * @param password - Mot de passe en clair.
   * @returns Le sel et le hash, en hexadécimal.
   */
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = await scryptAsync(password, salt, KEY_LENGTH);
    return `${salt}:${hash.toString('hex')}`;
  }

  /**
   * Comparaison en temps constant (timingSafeEqual).
   * @param password - Mot de passe en clair.
   * @param stored - Valeur stockée "<sel>:<hash>".
   * @returns `true` si le mot de passe correspond ; `false` aussi si la valeur stockée est mal formée.
   */
  async verify(password: string, stored: string): Promise<boolean> {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const candidate = await scryptAsync(password, salt, KEY_LENGTH);
    return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
  }
}
