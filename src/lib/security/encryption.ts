/**
 * Serviço de criptografia AES-256-CBC para dados sensíveis por Tenant
 * (hoje: a chave de API do Nibo armazenada em IntegrationConfig).
 *
 * ENCRYPTION_KEY (env) deve ser um segredo de alta entropia — não uma senha
 * memorável — pois é reduzida a 32 bytes via SHA-256 sem salt/KDF. Gere com:
 *   openssl rand -hex 32
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH_BYTES = 16;

export interface EncryptedPayload {
  encryptedKey: string;
  iv: string;
}

function getDerivedKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('ENCRYPTION_KEY não configurada. Defina essa variável de ambiente antes de criptografar/descriptografar dados.');
  }
  return createHash('sha256').update(secret).digest();
}

export function encrypt(plainText: string): EncryptedPayload {
  const key = getDerivedKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);

  return {
    encryptedKey: encrypted.toString('hex'),
    iv: iv.toString('hex'),
  };
}

export function decrypt(encryptedKey: string, iv: string): string {
  const key = getDerivedKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedKey, 'hex')), decipher.final()]);

  return decrypted.toString('utf8');
}
