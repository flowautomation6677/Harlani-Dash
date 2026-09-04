/**
 * Token de sessão assinado (HMAC-SHA256), sem dependência externa (jose/jsonwebtoken).
 * Formato: "<payload_base64url>.<assinatura_base64url>".
 *
 * SESSION_SECRET (env) deve ser um segredo de alta entropia, distinto de
 * ENCRYPTION_KEY (propósitos diferentes: assinar sessão vs. cifrar credenciais).
 * Gere com: openssl rand -hex 32
 */
import { createHmac, timingSafeEqual } from 'crypto';
import type { Role } from '@prisma/client';

const DEFAULT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 7 dias

export interface SessionInput {
  userId: string;
  tenantId: string | null;
  role: Role;
}

export interface SessionPayload extends SessionInput {
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET não configurada. Defina essa variável de ambiente para emitir/verificar sessões.');
  }
  return secret;
}

function sign(payloadB64: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

export function createSessionToken(input: SessionInput, expiresInSeconds = DEFAULT_EXPIRES_IN_SECONDS): string {
  const secret = getSecret();
  const payload: SessionPayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return null;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }

  const expectedSignature = sign(payloadB64, secret);
  const expectedBuf = Buffer.from(expectedSignature);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}
