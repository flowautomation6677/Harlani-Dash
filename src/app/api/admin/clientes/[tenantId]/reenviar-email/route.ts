import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { getPrimaryUserForTenant } from '@/lib/repositories/tenantRepository';
import { sendSetPasswordEmail } from '@/lib/notifications/mailer';

export const dynamic = 'force-dynamic';

/** Reenvia o e-mail de definição de senha (mock) para o usuário principal do tenant. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const sessionOrError = requireRole(request, 'SUPER_ADMIN');
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const { tenantId } = await params;

  const user = await getPrimaryUserForTenant(tenantId);
  if (!user) {
    return NextResponse.json({ error: 'Nenhum usuário encontrado para este tenant.' }, { status: 404 });
  }

  await sendSetPasswordEmail(user.email, user.name);

  return NextResponse.json({ ok: true, sentTo: user.email });
}
