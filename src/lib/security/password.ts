/**
 * Hash de senha via scrypt nativo (node:crypto) — sem dependência externa.
 * Formato armazenado: "<salt_hex>:<hash_hex>".
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(plainPassword, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  const [salt, hashHex] = storedHash.split(':');
  if (!salt || !hashHex) return false;

  const storedKey = Buffer.from(hashHex, 'hex');
  const derivedKey = (await scrypt(plainPassword, salt, KEY_LENGTH)) as Buffer;

  if (storedKey.length !== derivedKey.length) return false;
  return timingSafeEqual(storedKey, derivedKey);
}
