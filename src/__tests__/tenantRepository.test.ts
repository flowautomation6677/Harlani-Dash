/**
 * tenantRepository.test.ts
 *
 * TDD: escrito antes da implementação de src/lib/repositories/tenantRepository.ts.
 * Mocka o Prisma Client e o serviço de criptografia — o objetivo aqui é testar
 * a regra de negócio (o que é chamado, com quais dados), não o Postgres real
 * (isso já foi validado manualmente na Fase 1).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    tenant: {
      create: vi.fn(),
    },
    integrationConfig: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/security/encryption', () => ({
  encrypt: vi.fn(),
}));

import { prisma } from '@/lib/db/prisma';
import { encrypt } from '@/lib/security/encryption';
import { createTenant, linkNiboIntegration } from '@/lib/repositories/tenantRepository';

describe('createTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar um tenant com nome e documento', async () => {
    vi.mocked(prisma.tenant.create).mockResolvedValue({
      id: 'tenant-1',
      name: 'Harlani Rodrigues',
      document: '23.121.297/0001-49',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await createTenant({ name: 'Harlani Rodrigues', document: '23.121.297/0001-49' });

    expect(prisma.tenant.create).toHaveBeenCalledWith({
      data: { name: 'Harlani Rodrigues', document: '23.121.297/0001-49' },
    });
    expect(result.id).toBe('tenant-1');
  });

  it('deve criar um tenant sem documento (opcional)', async () => {
    vi.mocked(prisma.tenant.create).mockResolvedValue({ id: 'tenant-2', name: 'Cursos GHF' } as never);

    await createTenant({ name: 'Cursos GHF' });

    expect(prisma.tenant.create).toHaveBeenCalledWith({
      data: { name: 'Cursos GHF', document: undefined },
    });
  });
});

describe('linkNiboIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criptografar a chave em texto puro antes de persistir', async () => {
    vi.mocked(encrypt).mockReturnValue({ encryptedKey: 'cipher-abc', iv: 'iv-abc' });
    vi.mocked(prisma.integrationConfig.upsert).mockResolvedValue({ id: 'integ-1' } as never);

    await linkNiboIntegration('tenant-1', 'TOKEN_NIBO_EM_TEXTO_PURO');

    expect(encrypt).toHaveBeenCalledWith('TOKEN_NIBO_EM_TEXTO_PURO');
  });

  it('nunca deve enviar a chave em texto puro para o Prisma', async () => {
    vi.mocked(encrypt).mockReturnValue({ encryptedKey: 'cipher-xyz', iv: 'iv-xyz' });
    vi.mocked(prisma.integrationConfig.upsert).mockResolvedValue({ id: 'integ-2' } as never);

    await linkNiboIntegration('tenant-1', 'SEGREDO_QUE_NAO_PODE_VAZAR');

    const call = vi.mocked(prisma.integrationConfig.upsert).mock.calls[0][0];
    const serializedCall = JSON.stringify(call);
    expect(serializedCall).not.toContain('SEGREDO_QUE_NAO_PODE_VAZAR');
    expect(serializedCall).toContain('cipher-xyz');
    expect(serializedCall).toContain('iv-xyz');
  });

  it('deve fazer upsert usando a chave única [tenantId, provider] (idempotente / permite rotação de chave)', async () => {
    vi.mocked(encrypt).mockReturnValue({ encryptedKey: 'cipher-1', iv: 'iv-1' });
    vi.mocked(prisma.integrationConfig.upsert).mockResolvedValue({ id: 'integ-3' } as never);

    await linkNiboIntegration('tenant-1', 'token-1');

    expect(prisma.integrationConfig.upsert).toHaveBeenCalledWith({
      where: { tenantId_provider: { tenantId: 'tenant-1', provider: 'NIBO' } },
      create: {
        tenantId: 'tenant-1',
        provider: 'NIBO',
        encryptedKey: 'cipher-1',
        iv: 'iv-1',
      },
      update: {
        encryptedKey: 'cipher-1',
        iv: 'iv-1',
        isActive: true,
      },
    });
  });
});
