import type { Role } from '@prisma/client';

/** Prefixos de rota exclusivos do SUPER_ADMIN. */
const ADMIN_ONLY_PREFIXES = ['/admin'];

/** Para onde um CLIENT é mandado ao tentar acessar uma rota admin-only. */
export const ADMIN_REDIRECT_PATH = '/dashboard';

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function canAccessPath(role: Role, pathname: string): boolean {
  if (isAdminOnlyPath(pathname) && role !== 'SUPER_ADMIN') return false;
  return true;
}
