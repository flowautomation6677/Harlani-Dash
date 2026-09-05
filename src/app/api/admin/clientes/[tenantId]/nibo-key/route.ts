import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/requireRole';
import { linkNiboIntegration } from '@/lib/repositories/tenantRepository';

export const dynamic = 'force-dynamic';

const NiboKeySchema = z.object({
  niboApiKey: z.string().trim().min(1, 'Chave de API do Nibo é obrigatória.'),
});

/** Rotaciona a chave do Nibo de um tenant existente. Acesso: SUPER_ADMIN. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const sessionOrError = requireRole(request, 'SUPER_ADMIN');
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const body = await request.json().catch(() => null);
  const parsed = NiboKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dados inválidos.' }, { status: 400 });
  }

  const { tenantId } = await params;

  try {
    const integration = await linkNiboIntegration(tenantId, parsed.data.niboApiKey);
    return NextResponse.json({
      integration: { id: integration.id, isActive: integration.isActive, tenantId: integration.tenantId },
    });
  } catch (error) {
    console.error('[admin/clientes/nibo-key] Falha ao atualizar chave:', error);
    return NextResponse.json({ error: 'Falha ao atualizar a chave do Nibo.' }, { status: 500 });
  }
}
