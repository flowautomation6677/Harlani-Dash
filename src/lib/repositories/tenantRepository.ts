import { prisma } from '@/lib/db/prisma';
import { encrypt } from '@/lib/security/encryption';
import type { IntegrationProvider, Tenant, IntegrationConfig } from '@prisma/client';

export interface CreateTenantInput {
  name: string;
  document?: string;
}

export function createTenant(input: CreateTenantInput): Promise<Tenant> {
  return prisma.tenant.create({
    data: { name: input.name, document: input.document },
  });
}

/**
 * Cria ou atualiza (rotação de chave) a integração do Nibo de um Tenant.
 * A chave em texto puro nunca é persistida — apenas o resultado de encrypt().
 */
export function linkNiboIntegration(
  tenantId: string,
  plainApiKey: string,
  provider: IntegrationProvider = 'NIBO'
): Promise<IntegrationConfig> {
  const { encryptedKey, iv } = encrypt(plainApiKey);

  return prisma.integrationConfig.upsert({
    where: { tenantId_provider: { tenantId, provider } },
    create: { tenantId, provider, encryptedKey, iv },
    update: { encryptedKey, iv, isActive: true },
  });
}
