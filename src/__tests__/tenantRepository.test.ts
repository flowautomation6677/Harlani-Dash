/**
 * tenantRepository.test.ts
 *
 * TDD: escrito antes da implementação de src/lib/repositories/tenantRepository.ts.
 * Mocka o Prisma Client e o serviço de criptografia — o objetivo aqui é testar
 * a regra de negócio (o que é chamado, com quais dados), não o Postgres real
 * (isso já foi validado manualmente na Fase 1).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTx = {
  tenant: { create: vi.fn() },
  integrationConfig: { create: vi.fn() },
  user: { create: vi.fn() },
};

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    tenant: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    integrationConfig: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/security/encryption', () => ({
  encrypt: vi.fn(),
  decrypt: vi.fn(),
}));

vi.mock('@/lib/security/password', () => ({
  hashPassword: vi.fn(),
}));

import { prisma } from '@/lib/db/prisma';
import { encrypt, decrypt } from '@/lib/security/encryption';
import { hashPassword } from '@/lib/security/password';
import {
  createTenant,
  linkNiboIntegration,
  getDecryptedNiboKey,
  listTenants,
  provisionTenant,
  setTenantActiveStatus,
  getPrimaryUserForTenant,
} from '@/lib/repositories/tenantRepository';

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

describe('getDecryptedNiboKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve buscar a IntegrationConfig do tenant correto e retornar a chave já descriptografada', async () => {
    vi.mocked(prisma.integrationConfig.findUnique).mockResolvedValue({
      id: 'integ-1',
      tenantId: 'tenant-1',
      provider: 'NIBO',
      encryptedKey: 'cipher-abc',
      iv: 'iv-abc',
      isActive: true,
    } as never);
    vi.mocked(decrypt).mockReturnValue('TOKEN_NIBO_EM_TEXTO_PURO');

    const key = await getDecryptedNiboKey('tenant-1');

    expect(prisma.integrationConfig.findUnique).toHaveBeenCalledWith({
      where: { tenantId_provider: { tenantId: 'tenant-1', provider: 'NIBO' } },
    });
    expect(decrypt).toHaveBeenCalledWith('cipher-abc', 'iv-abc');
    expect(key).toBe('TOKEN_NIBO_EM_TEXTO_PURO');
  });

  it('deve lançar erro se o tenant não tiver nenhuma IntegrationConfig cadastrada', async () => {
    vi.mocked(prisma.integrationConfig.findUnique).mockResolvedValue(null);

    await expect(getDecryptedNiboKey('tenant-sem-integracao')).rejects.toThrow();
    expect(decrypt).not.toHaveBeenCalled();
  });

  it('deve lançar erro se a IntegrationConfig existir mas estiver inativa (isActive: false)', async () => {
    vi.mocked(prisma.integrationConfig.findUnique).mockResolvedValue({
      id: 'integ-2',
      tenantId: 'tenant-2',
      provider: 'NIBO',
      encryptedKey: 'cipher-x',
      iv: 'iv-x',
      isActive: false,
    } as never);

    await expect(getDecryptedNiboKey('tenant-2')).rejects.toThrow();
    expect(decrypt).not.toHaveBeenCalled();
  });
});

describe('listTenants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve listar tenants ordenados por criação mais recente, com contagem de usuários, integrações e o usuário principal', async () => {
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([
      {
        id: 'tenant-1',
        name: 'Harlani Rodrigues',
        document: '23.121.297/0001-49',
        isActive: true,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        _count: { users: 1 },
        integrations: [{ provider: 'NIBO', isActive: true, lastSyncAt: null }],
        users: [{ id: 'user-1', email: 'harlani@harlani.local' }],
      },
    ] as never);

    const result = await listTenants();

    expect(prisma.tenant.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true } },
        integrations: { select: { provider: true, isActive: true, lastSyncAt: true } },
        users: { select: { id: true, email: true }, take: 1, orderBy: { createdAt: 'asc' } },
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Harlani Rodrigues');
    expect(result[0].users[0].email).toBe('harlani@harlani.local');
  });

  it('deve retornar lista vazia sem erro quando não há tenants', async () => {
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([] as never);

    const result = await listTenants();

    expect(result).toEqual([]);
  });
});

describe('provisionTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(((cb: (tx: typeof mockTx) => unknown) =>
      cb(mockTx)) as unknown as typeof prisma.$transaction);
  });

  const input = {
    companyName: 'Nova Empresa LTDA',
    clientEmail: 'contato@novaempresa.com',
    niboApiKey: 'TOKEN_NIBO_EM_TEXTO_PURO',
  };

  it('deve criptografar a chave do Nibo antes de criar a IntegrationConfig', async () => {
    vi.mocked(encrypt).mockReturnValue({ encryptedKey: 'cipher-abc', iv: 'iv-abc' });
    vi.mocked(hashPassword).mockResolvedValue('salt:hash');
    mockTx.tenant.create.mockResolvedValue({ id: 'tenant-novo', name: input.companyName });
    mockTx.integrationConfig.create.mockResolvedValue({ id: 'integ-novo' });
    mockTx.user.create.mockResolvedValue({ id: 'user-novo', email: input.clientEmail });

    await provisionTenant(input);

    expect(encrypt).toHaveBeenCalledWith(input.niboApiKey);
    const integrationCall = mockTx.integrationConfig.create.mock.calls[0][0];
    expect(JSON.stringify(integrationCall)).not.toContain(input.niboApiKey);
    expect(integrationCall.data.encryptedKey).toBe('cipher-abc');
    expect(integrationCall.data.iv).toBe('iv-abc');
  });

  it('deve criar Tenant, IntegrationConfig e User dentro da mesma transação, ligados pelo tenantId', async () => {
    vi.mocked(encrypt).mockReturnValue({ encryptedKey: 'cipher-abc', iv: 'iv-abc' });
    vi.mocked(hashPassword).mockResolvedValue('salt:hash-temporario');
    mockTx.tenant.create.mockResolvedValue({ id: 'tenant-novo', name: input.companyName });
    mockTx.integrationConfig.create.mockResolvedValue({ id: 'integ-novo', tenantId: 'tenant-novo' });
    mockTx.user.create.mockResolvedValue({ id: 'user-novo', email: input.clientEmail, tenantId: 'tenant-novo' });

    const result = await provisionTenant(input);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.tenant.create).toHaveBeenCalledWith({ data: { name: input.companyName } });
    expect(mockTx.integrationConfig.create).toHaveBeenCalledWith({
      data: { tenantId: 'tenant-novo', provider: 'NIBO', encryptedKey: 'cipher-abc', iv: 'iv-abc' },
    });
    expect(mockTx.user.create).toHaveBeenCalledWith({
      data: {
        email: input.clientEmail,
        passwordHash: 'salt:hash-temporario',
        role: 'CLIENT',
        tenantId: 'tenant-novo',
      },
    });
    expect(result.tenant.id).toBe('tenant-novo');
    expect(result.user.id).toBe('user-novo');
    expect(result.integration.id).toBe('integ-novo');
  });

  it('nunca deve retornar o passwordHash gerado', async () => {
    vi.mocked(encrypt).mockReturnValue({ encryptedKey: 'cipher-abc', iv: 'iv-abc' });
    vi.mocked(hashPassword).mockResolvedValue('salt:hash-secreto');
    mockTx.tenant.create.mockResolvedValue({ id: 'tenant-novo' });
    mockTx.integrationConfig.create.mockResolvedValue({ id: 'integ-novo' });
    mockTx.user.create.mockResolvedValue({ id: 'user-novo', email: input.clientEmail, passwordHash: 'salt:hash-secreto' });

    const result = await provisionTenant(input);

    expect(JSON.stringify(result)).not.toContain('hash-secreto');
  });
});

describe('setTenantActiveStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve desativar um tenant', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({ id: 'tenant-1', isActive: false } as never);

    const result = await setTenantActiveStatus('tenant-1', false);

    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: { isActive: false },
    });
    expect(result.isActive).toBe(false);
  });

  it('deve reativar um tenant', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({ id: 'tenant-1', isActive: true } as never);

    await setTenantActiveStatus('tenant-1', true);

    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: { isActive: true },
    });
  });
});

describe('getPrimaryUserForTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar o usuário mais antigo do tenant', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'user-1', email: 'harlani@harlani.local', name: 'Harlani' } as never);

    const result = await getPrimaryUserForTenant('tenant-1');

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(result?.email).toBe('harlani@harlani.local');
  });

  it('deve retornar null se o tenant não tiver nenhum usuário', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const result = await getPrimaryUserForTenant('tenant-sem-usuario');

    expect(result).toBeNull();
  });
});
