import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, type SessionPayload } from '@/lib/security/session';

export const SESSION_COOKIE_NAME = 'harlani_session';

/**
 * Extrai e valida a sessão (userId, tenantId, role) a partir do cookie
 * assinado na requisição. Retorna null se não houver sessão ou se ela
 * for inválida/expirada/adulterada. Uso: Route Handlers / proxy.ts.
 */
export function getSession(request: NextRequest): SessionPayload | null {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Mesma coisa que getSession(), mas para Server Components (que não têm
 * acesso a um NextRequest) — lê o cookie via next/headers.
 */
export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
