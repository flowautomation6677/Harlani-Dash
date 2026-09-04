/**
 * session.test.ts
 *
 * TDD: escrito antes da implementação de src/lib/security/session.ts.
 * Esta é a lógica de extração do Tenant a partir da sessão pedida na Fase 3 —
 * cobrimos aqui antes de plugar no cookie/Next.js (auth/getSession.ts).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSessionToken, verifySessionToken } from '@/lib/security/session';

const ORIGINAL_SECRET = process.env.SESSION_SECRET;

describe('session token (assinado com HMAC)', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-sessao-para-teste-alta-entropia';
  });

  afterEach(() => {
    process.env.SESSION_SECRET = ORIGINAL_SECRET;
  });

  it('deve extrair o tenantId, userId e role corretos de um token válido', () => {
    const token = createSessionToken({ userId: 'user-1', tenantId: 'tenant-1', role: 'CLIENT' });
    const session = verifySessionToken(token);

    expect(session).not.toBeNull();
    expect(session?.tenantId).toBe('tenant-1');
    expect(session?.userId).toBe('user-1');
    expect(session?.role).toBe('CLIENT');
  });

  it('deve suportar tenantId nulo (ex: SUPER_ADMIN sem tenant fixo)', () => {
    const token = createSessionToken({ userId: 'admin-1', tenantId: null, role: 'SUPER_ADMIN' });
    const session = verifySessionToken(token);

    expect(session?.tenantId).toBeNull();
    expect(session?.role).toBe('SUPER_ADMIN');
  });

  it('deve retornar null para um token com assinatura adulterada', () => {
    const token = createSessionToken({ userId: 'user-1', tenantId: 'tenant-1', role: 'CLIENT' });
    const [payload] = token.split('.');
    const tampered = `${payload}.assinatura-forjada`;

    expect(verifySessionToken(tampered)).toBeNull();
  });

  it('deve retornar null para um token cujo payload foi adulterado (ex: trocar tenantId)', () => {
    const token = createSessionToken({ userId: 'user-1', tenantId: 'tenant-A', role: 'CLIENT' });
    const [payload, signature] = token.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ userId: 'user-1', tenantId: 'tenant-B-roubado', role: 'CLIENT', exp: Date.now() / 1000 + 3600 })
    ).toString('base64url');

    expect(verifySessionToken(`${forgedPayload}.${signature}`)).toBeNull();
  });

  it('deve retornar null para um token expirado', () => {
    const token = createSessionToken({ userId: 'user-1', tenantId: 'tenant-1', role: 'CLIENT' }, -10);
    expect(verifySessionToken(token)).toBeNull();
  });

  it('deve retornar null para um token assinado com um SESSION_SECRET diferente', () => {
    const token = createSessionToken({ userId: 'user-1', tenantId: 'tenant-1', role: 'CLIENT' });

    process.env.SESSION_SECRET = 'outro-segredo-completamente-diferente';
    expect(verifySessionToken(token)).toBeNull();
  });

  it('deve retornar null para strings malformadas (vazia, sem ponto, lixo)', () => {
    expect(verifySessionToken('')).toBeNull();
    expect(verifySessionToken('sem-ponto-nenhum')).toBeNull();
    expect(verifySessionToken('lixo.total.aqui')).toBeNull();
  });
});
