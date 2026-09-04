/**
 * authService.test.ts
 *
 * TDD: escrito antes da implementação de src/lib/auth/authService.ts.
 * Mocka Prisma, verifyPassword e createSessionToken — foco na regra de
 * negócio de autenticação, não nas implementações de baixo nível (já
 * cobertas em password.test.ts e session.test.ts).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/security/password', () => ({
  verifyPassword: vi.fn(),
}));

vi.mock('@/lib/security/session', () => ({
  createSessionToken: vi.fn(),
}));

import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/security/password';
import { createSessionToken } from '@/lib/security/session';
import { authenticate } from '@/lib/auth/authService';

describe('authenticate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar null se o email não existir', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await authenticate('naoexiste@example.com', 'qualquer');

    expect(result).toBeNull();
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(createSessionToken).not.toHaveBeenCalled();
  });

  it('deve retornar null se a senha estiver incorreta', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash-armazenado',
      role: 'CLIENT',
      tenantId: 'tenant-1',
    } as never);
    vi.mocked(verifyPassword).mockResolvedValue(false);

    const result = await authenticate('user@example.com', 'senha-errada');

    expect(result).toBeNull();
    expect(createSessionToken).not.toHaveBeenCalled();
  });

  it('deve retornar o token de sessão e os dados do usuário (sem passwordHash) em caso de sucesso', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash-armazenado',
      name: 'Fulano',
      role: 'CLIENT',
      tenantId: 'tenant-1',
    } as never);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(createSessionToken).mockReturnValue('token-assinado-fake');

    const result = await authenticate('user@example.com', 'senha-correta');

    expect(createSessionToken).toHaveBeenCalledWith({ userId: 'user-1', tenantId: 'tenant-1', role: 'CLIENT' });
    expect(result).toEqual({
      token: 'token-assinado-fake',
      user: { id: 'user-1', email: 'user@example.com', name: 'Fulano', role: 'CLIENT', tenantId: 'tenant-1' },
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(result)).not.toContain('hash-armazenado');
  });
});
