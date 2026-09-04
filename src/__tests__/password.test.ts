/**
 * password.test.ts
 *
 * TDD: escrito antes da implementação de src/lib/security/password.ts.
 */

import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/security/password';

describe('password service (scrypt)', () => {
  it('deve verificar como válida a senha correta', async () => {
    const hash = await hashPassword('minhaSenhaForte123');
    expect(await verifyPassword('minhaSenhaForte123', hash)).toBe(true);
  });

  it('deve rejeitar a senha incorreta', async () => {
    const hash = await hashPassword('minhaSenhaForte123');
    expect(await verifyPassword('senhaErrada', hash)).toBe(false);
  });

  it('deve gerar hashes diferentes para a mesma senha (salt aleatório)', async () => {
    const hashA = await hashPassword('mesmaSenha');
    const hashB = await hashPassword('mesmaSenha');
    expect(hashA).not.toBe(hashB);
    expect(await verifyPassword('mesmaSenha', hashA)).toBe(true);
    expect(await verifyPassword('mesmaSenha', hashB)).toBe(true);
  });

  it('nunca deve armazenar a senha em texto puro dentro do hash', async () => {
    const hash = await hashPassword('senhaSecreta');
    expect(hash).not.toContain('senhaSecreta');
  });

  it('deve retornar false para um hash malformado, sem lançar erro', async () => {
    await expect(verifyPassword('qualquer', 'hash-invalido-sem-formato')).resolves.toBe(false);
  });
});
