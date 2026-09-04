// scripts/seed-dev-tenants.mjs
//
// Seed de desenvolvimento para a Fase 3 (multi-tenant): cria os dois tenants
// reais do projeto (Harlani Rodrigues / Cursos GHF), um usuário CLIENT por
// tenant, e vincula a IntegrationConfig do Nibo usando os tokens que já
// estavam soltos no .env.local (agora criptografados no banco).
//
// Idempotente — pode rodar de novo (upsert por nome/email).
//
// Uso:
//   node --env-file=.env.local scripts/seed-dev-tenants.mjs

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createCipheriv, randomBytes, createHash, scrypt as scryptCb } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const DEV_PASSWORD = 'harlani-dev-2026';

// Replica src/lib/security/password.ts e encryption.ts (TS não roda direto
// aqui sem bundler) — mesma lógica, só para popular o banco local.
async function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(plain, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

function encrypt(plainText) {
  const key = createHash('sha256').update(process.env.ENCRYPTION_KEY).digest();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  return { encryptedKey: encrypted.toString('hex'), iv: iv.toString('hex') };
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente — rode com node --env-file=.env.local');
if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY ausente — rode com node --env-file=.env.local');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TENANTS = [
  {
    name: process.env.NEXT_PUBLIC_NIBO_CLIENT_1_NAME?.trim() || 'Harlani Rodrigues',
    document: process.env.NEXT_PUBLIC_NIBO_CLIENT_1_CNPJ?.trim(),
    email: 'harlani@harlani.local',
    niboToken: process.env.NIBO_API_TOKEN,
  },
  {
    name: process.env.NEXT_PUBLIC_NIBO_CLIENT_2_NAME?.trim() || 'Cursos GHF',
    document: process.env.NEXT_PUBLIC_NIBO_CLIENT_2_CNPJ?.trim(),
    email: 'ghf@harlani.local',
    niboToken: process.env.NIBO_API_TOKEN_CLIENT_2,
  },
];

for (const t of TENANTS) {
  if (!t.niboToken) {
    console.warn(`⚠️  Pulando "${t.name}": token do Nibo não encontrado no .env.local`);
    continue;
  }

  let tenant = await prisma.tenant.findFirst({ where: { name: t.name } });
  if (!tenant) {
    tenant = await prisma.tenant.create({ data: { name: t.name, document: t.document } });
    console.log(`Tenant criado: ${t.name} (${tenant.id})`);
  } else {
    console.log(`Tenant já existia: ${t.name} (${tenant.id})`);
  }

  const passwordHash = await hashPassword(DEV_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: t.email },
    create: { email: t.email, passwordHash, role: 'CLIENT', tenantId: tenant.id, name: t.name },
    update: { passwordHash, tenantId: tenant.id },
  });
  console.log(`  User: ${user.email} (senha dev: ${DEV_PASSWORD})`);

  const { encryptedKey, iv } = encrypt(t.niboToken);
  await prisma.integrationConfig.upsert({
    where: { tenantId_provider: { tenantId: tenant.id, provider: 'NIBO' } },
    create: { tenantId: tenant.id, provider: 'NIBO', encryptedKey, iv },
    update: { encryptedKey, iv, isActive: true },
  });
  console.log(`  IntegrationConfig NIBO vinculada (chave criptografada, não gravada em texto puro).`);
}

await prisma.$disconnect();
console.log('\nSeed concluído.');
