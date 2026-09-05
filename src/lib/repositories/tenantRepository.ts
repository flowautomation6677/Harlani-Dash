import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { encrypt, decrypt } from '@/lib/security/encryption';
import { hashPassword } from '@/lib/security/password';
import type { IntegrationProvider, Tenant, IntegrationConfig, User } from '@prisma/client';

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

export interface TenantWithStats extends Tenant {
  _count: { users: number };
  integrations: { provider: IntegrationProvider; isActive: boolean; lastSyncAt: Date | null }[];
  users: { id: string; email: string }[];
}

/**
 * Lista todos os tenants para o painel de administração (SUPER_ADMIN),
 * com contagem de usuários, status das integrações e o usuário principal
 * (o mais antigo) — usado na Data Table de /admin/tenants.
 */
export function listTenants(): Promise<TenantWithStats[]> {
  return prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true } },
      integrations: { select: { provider: true, isActive: true, lastSyncAt: true } },
      users: { select: { id: true, email: true }, take: 1, orderBy: { createdAt: 'asc' } },
    },
  }) as Promise<TenantWithStats[]>;
}

/**
 * Ativa/desativa um tenant (ação "Desativar Cliente" do painel de admin).
 */
export function setTenantActiveStatus(tenantId: string, isActive: boolean): Promise<Tenant> {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive },
  });
}

/**
 * O usuário "principal" de um tenant — hoje, simplesmente o mais antigo
 * (todo tenant provisionado via /api/admin/clientes nasce com exatamente
 * um usuário CLIENT). Usado para reenviar o e-mail de definição de senha.
 */
export function getPrimaryUserForTenant(tenantId: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Busca a IntegrationConfig ativa do Nibo para o tenant e retorna a chave
 * de API já descriptografada, pronta para ir no header da requisição.
 */
export async function getDecryptedNiboKey(
  tenantId: string,
  provider: IntegrationProvider = 'NIBO'
): Promise<string> {
  const config = await prisma.integrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider } },
  });

  if (!config || !config.isActive) {
    throw new Error(`Nenhuma integração ${provider} ativa configurada para este tenant.`);
  }

  return decrypt(config.encryptedKey, config.iv);
}

export interface ProvisionTenantInput {
  companyName: string;
  clientEmail: string;
  niboApiKey: string;
}

export interface ProvisionedUser {
  id: string;
  email: string;
}

export interface ProvisionTenantResult {
  tenant: Tenant;
  integration: IntegrationConfig;
  user: ProvisionedUser;
}

/**
 * Provisiona um novo cliente do zero: Tenant + IntegrationConfig (Nibo,
 * chave já criptografada) + User (role CLIENT) — tudo em uma única
 * transação Prisma. Se qualquer uma das três criações falhar (ex: e-mail
 * já cadastrado), nada é persistido — evita Tenant/IntegrationConfig órfãos.
 *
 * O usuário é criado com uma senha temporária aleatória, nunca comunicada;
 * o acesso real depende do fluxo de "definir senha" enviado por e-mail
 * (hoje mockado em src/lib/notifications/mailer.ts).
 */
export async function provisionTenant(input: ProvisionTenantInput): Promise<ProvisionTenantResult> {
  const { encryptedKey, iv } = encrypt(input.niboApiKey);
  const temporaryPasswordHash = await hashPassword(randomBytes(32).toString('hex'));

  const { tenant, integration, user } = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: { name: input.companyName } });

    const integration = await tx.integrationConfig.create({
      data: { tenantId: tenant.id, provider: 'NIBO', encryptedKey, iv },
    });

    const user = await tx.user.create({
      data: {
        email: input.clientEmail,
        passwordHash: temporaryPasswordHash,
        role: 'CLIENT',
        tenantId: tenant.id,
      },
    });

    return { tenant, integration, user };
  });

  return { tenant, integration, user: { id: user.id, email: user.email } };
}
