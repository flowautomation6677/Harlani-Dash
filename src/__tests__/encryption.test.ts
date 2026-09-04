/**
 * encryption.test.ts
 *
 * TDD: escrito antes da implementação de src/lib/security/encryption.ts.
 * Cobre o serviço de criptografia AES-256-CBC usado para armazenar a chave
 * de API do Nibo por Tenant (IntegrationConfig.encryptedKey / .iv).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt } from '@/lib/security/encryption';

const ORIGINAL_ENV = process.env.ENCRYPTION_KEY;

describe('encryption service (AES-256-CBC)', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'chave-secreta-de-teste-com-alta-entropia';
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = ORIGINAL_ENV;
  });

  it('deve descriptografar de volta para o texto original', () => {
    const plainText = 'TOKEN_NIBO_36B453487E7F4D358D866256A4445C7F';
    const { encryptedKey, iv } = encrypt(plainText);

    expect(decrypt(encryptedKey, iv)).toBe(plainText);
  });

  it('deve retornar encryptedKey e iv como strings hexadecimais não vazias', () => {
    const { encryptedKey, iv } = encrypt('qualquer-token');

    expect(encryptedKey).toEqual(expect.any(String));
    expect(iv).toEqual(expect.any(String));
    expect(encryptedKey.length).toBeGreaterThan(0);
    expect(/^[0-9a-f]+$/i.test(encryptedKey)).toBe(true);
    expect(/^[0-9a-f]+$/i.test(iv)).toBe(true);
  });

  it('deve gerar um IV de 16 bytes (32 chars hex) — obrigatório para AES-CBC', () => {
    const { iv } = encrypt('outro-token');
    expect(iv).toHaveLength(32);
  });

  it('deve gerar IV e ciphertext diferentes a cada chamada para o mesmo texto', () => {
    const a = encrypt('mesmo-texto');
    const b = encrypt('mesmo-texto');

    expect(a.iv).not.toBe(b.iv);
    expect(a.encryptedKey).not.toBe(b.encryptedKey);
    // mas ambos devem decriptar para o mesmo valor original
    expect(decrypt(a.encryptedKey, a.iv)).toBe('mesmo-texto');
    expect(decrypt(b.encryptedKey, b.iv)).toBe('mesmo-texto');
  });

  it('deve suportar caracteres unicode e especiais no texto original', () => {
    const plainText = 'token-com-açentuação-e-símb0los-!@#$%^&*()_+çãõ';
    const { encryptedKey, iv } = encrypt(plainText);

    expect(decrypt(encryptedKey, iv)).toBe(plainText);
  });

  it('deve lançar erro se ENCRYPTION_KEY não estiver configurada', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('token')).toThrow(/ENCRYPTION_KEY/);
  });

  it('deve lançar erro ao tentar descriptografar com um IV incorreto', () => {
    const { encryptedKey } = encrypt('token-original');
    const wrongIv = '00'.repeat(16);

    expect(() => decrypt(encryptedKey, wrongIv)).toThrow();
  });

  it('deve lançar erro ao tentar descriptografar com ENCRYPTION_KEY diferente da usada para criptografar', () => {
    const { encryptedKey, iv } = encrypt('token-original');

    process.env.ENCRYPTION_KEY = 'outra-chave-completamente-diferente';
    expect(() => decrypt(encryptedKey, iv)).toThrow();
  });

  it('deve lançar erro ao tentar descriptografar um encryptedKey corrompido/adulterado', () => {
    const { encryptedKey, iv } = encrypt('token-original');
    // Adultera o último byte do ciphertext
    const tampered = encryptedKey.slice(0, -2) + (encryptedKey.slice(-2) === '00' ? '01' : '00');

    expect(() => decrypt(tampered, iv)).toThrow();
  });
});
