import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/getSession';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId },
  });
}
