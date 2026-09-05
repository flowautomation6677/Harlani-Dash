import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireRole } from '@/lib/auth/requireRole';
import { provisionTenant } from '@/lib/repositories/tenantRepository';
import { sendSetPasswordEmail } from '@/lib/notifications/mailer';

export const dynamic = 'force-dynamic';

const ProvisionSchema = z.object({
  companyName: z.string().trim().min(1, 'Nome da empresa é obrigatório.'),
  clientEmail: z.string().email('E-mail inválido.'),
  niboApiKey: z.string().trim().min(1, 'Chave de API do Nibo é obrigatória.'),
});

/**
 * Cria um novo cliente do SaaS de ponta a ponta: Tenant + IntegrationConfig
 * (Nibo, chave criptografada) + User (CLIENT), em uma transação, e dispara
 * o e-mail de definição de senha (mock por enquanto). Acesso: SUPER_ADMIN.
 */
export async function POST(request: NextRequest) {
  const sessionOrError = requireRole(request, 'SUPER_ADMIN');
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const body = await request.json().catch(() => null);
  const parsed = ProvisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dados inválidos.' }, { status: 400 });
  }

  try {
    const { tenant, user } = await provisionTenant(parsed.data);
    await sendSetPasswordEmail(user.email, tenant.name);

    return NextResponse.json({ tenant, user }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe um usuário cadastrado com esse e-mail.' }, { status: 409 });
    }

    console.error('[admin/clientes] Falha ao provisionar tenant:', error);
    return NextResponse.json({ error: 'Falha ao provisionar o novo cliente.' }, { status: 500 });
  }
}
