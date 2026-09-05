import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Role } from '@prisma/client';
import { getSession } from './getSession';
import type { SessionPayload } from '@/lib/security/session';

/**
 * Checagem de auth+role para Route Handlers. Retorna a sessão válida, ou
 * já a NextResponse de erro pronta pra devolver (401/403) — quem chama só
 * precisa checar `instanceof NextResponse`.
 */
export function requireRole(request: NextRequest, role: Role): SessionPayload | NextResponse {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  if (session.role !== role) {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  }
  return session;
}
