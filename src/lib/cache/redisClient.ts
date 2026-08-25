/**
 * redisClient.ts
 *
 * Cliente Redis (Upstash) com fallback gracioso.
 *
 * Se as variaveis UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN
 * nao estiverem configuradas, todas as operacoes sao no-ops (sem cache).
 * O sistema funciona normalmente sem o Redis — apenas sem a resiliencia extra.
 *
 * Uso:
 *   const data = await getCached<MyType>('minha-chave');
 *   await setCached('minha-chave', data, 3600);
 */

import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// Singleton do cliente Redis (inicializado apenas se credenciais existirem)
// ---------------------------------------------------------------------------

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token || url.trim() === '' || token.trim() === '') {
    // Sem credenciais: cache desabilitado. Sem erros, sem crashes.
    return null;
  }

  try {
    redisClient = new Redis({ url, token });
    console.log('[Redis] ✅ Cache Upstash conectado com sucesso');
    return redisClient;
  } catch (err) {
    console.warn('[Redis] ⚠️ Falha ao conectar ao Upstash Redis:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Funcoes publicas de cache
// ---------------------------------------------------------------------------

/**
 * Busca um valor cacheado. Retorna null se nao encontrado ou Redis offline.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const data = await client.get<T>(key);
    return data ?? null;
  } catch (err) {
    console.warn(`[Redis] ⚠️ Erro ao ler chave "${key}":`, err);
    return null;
  }
}

/**
 * Salva um valor no cache com tempo de expiracao em segundos.
 */
export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.warn(`[Redis] ⚠️ Erro ao gravar chave "${key}":`, err);
  }
}

/**
 * Verifica se o Redis esta configurado e acessivel.
 */
export async function isRedisAvailable(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Status do cache para diagnostico.
 */
export function getCacheStatus(): { configured: boolean; connected: boolean } {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const configured = !!(url && token && url.trim() !== '' && token.trim() !== '');
  return { configured, connected: configured && redisClient !== null };
}
