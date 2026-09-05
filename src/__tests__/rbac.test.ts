/**
 * rbac.test.ts
 *
 * TDD: escrito antes da implementação de src/lib/auth/rbac.ts.
 * Regra de negócio pura (sem Next.js) de quais papéis podem acessar quais
 * rotas — o proxy.ts só chama isso, não reimplementa a decisão.
 */

import { describe, it, expect } from 'vitest';
import { isAdminOnlyPath, canAccessPath, ADMIN_REDIRECT_PATH } from '@/lib/auth/rbac';

describe('isAdminOnlyPath', () => {
  it('deve considerar /admin como admin-only', () => {
    expect(isAdminOnlyPath('/admin')).toBe(true);
  });

  it('deve considerar qualquer sub-rota de /admin como admin-only', () => {
    expect(isAdminOnlyPath('/admin/tenants')).toBe(true);
    expect(isAdminOnlyPath('/admin/tenants/123/editar')).toBe(true);
  });

  it('não deve confundir rotas com prefixo textual parecido (ex: /administracao)', () => {
    expect(isAdminOnlyPath('/administracao')).toBe(false);
  });

  it('não deve marcar rotas normais do dashboard como admin-only', () => {
    expect(isAdminOnlyPath('/dashboard')).toBe(false);
    expect(isAdminOnlyPath('/clientes')).toBe(false);
    expect(isAdminOnlyPath('/fluxo')).toBe(false);
  });
});

describe('canAccessPath', () => {
  it('SUPER_ADMIN pode acessar rotas admin-only', () => {
    expect(canAccessPath('SUPER_ADMIN', '/admin')).toBe(true);
    expect(canAccessPath('SUPER_ADMIN', '/admin/tenants')).toBe(true);
  });

  it('CLIENT não pode acessar rotas admin-only', () => {
    expect(canAccessPath('CLIENT', '/admin')).toBe(false);
    expect(canAccessPath('CLIENT', '/admin/tenants')).toBe(false);
  });

  it('CLIENT pode acessar rotas normais do dashboard', () => {
    expect(canAccessPath('CLIENT', '/dashboard')).toBe(true);
    expect(canAccessPath('CLIENT', '/clientes')).toBe(true);
  });

  it('SUPER_ADMIN pode acessar rotas normais tambem', () => {
    expect(canAccessPath('SUPER_ADMIN', '/dashboard')).toBe(true);
  });
});

describe('ADMIN_REDIRECT_PATH', () => {
  it('deve apontar para /dashboard', () => {
    expect(ADMIN_REDIRECT_PATH).toBe('/dashboard');
  });
});
