import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/security/password';
import { createSessionToken } from '@/lib/security/session';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: 'SUPER_ADMIN' | 'CLIENT';
  tenantId: string | null;
}

export interface AuthenticateResult {
  token: string;
  user: AuthenticatedUser;
}

/**
 * Valida email/senha e, em caso de sucesso, emite um token de sessão
 * assinado carregando o tenantId do usuário (fonte de verdade usada pela
 * API do Nibo para isolar dados entre clientes).
 */
export async function authenticate(email: string, plainPassword: string): Promise<AuthenticateResult | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const isValid = await verifyPassword(plainPassword, user.passwordHash);
  if (!isValid) return null;

  const token = createSessionToken({ userId: user.id, tenantId: user.tenantId, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    },
  };
}
