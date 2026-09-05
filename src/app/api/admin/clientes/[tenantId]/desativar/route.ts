import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/requireRole';
import { setTenantActiveStatus } from '@/lib/repositories/tenantRepository';

export const dynamic = 'force-dynamic';

const DesativarSchema = z.object({
  isActive: z.boolean(),
});

/** Ativa/desativa um tenant. Acesso: SUPER_ADMIN. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const sessionOrError = requireRole(request, 'SUPER_ADMIN');
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const body = await request.json().catch(() => null);
  const parsed = DesativarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const { tenantId } = await params;

  try {
    const tenant = await setTenantActiveStatus(tenantId, parsed.data.isActive);
    return NextResponse.json({ tenant: { id: tenant.id, isActive: tenant.isActive } });
  } catch (error) {
    console.error('[admin/clientes/desativar] Falha ao atualizar status:', error);
    return NextResponse.json({ error: 'Falha ao atualizar o status do tenant.' }, { status: 500 });
  }
}
