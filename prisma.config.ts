import { defineConfig, env } from 'prisma/config';

// Prisma 7 CLI não carrega .env/.env.local automaticamente (breaking change).
// Em dev, o Next.js já injeta .env.local em runtime; aqui carregamos manualmente
// só para os comandos do Prisma CLI (migrate, generate, studio...).
try {
  process.loadEnvFile('.env.local');
} catch {
  // .env.local não existe (ex: CI/produção) — variáveis já vêm do ambiente real.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
