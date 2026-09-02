/**
 * cacheKeys.ts
 *
 * Gerador padronizado de chaves de cache para o Redis.
 * Todas as chaves seguem o padrao: nibo:<endpoint>:<hash_da_query>
 * Isso permite invalidar grupos de chaves por endpoint facilmente.
 */

/** TTL em segundos para cada tipo de dado */
export const CACHE_TTL = {
  /** Agendamentos financeiros: cache por 4 horas */
  SCHEDULES: 60 * 60 * 4,
  /** Contas bancarias: cache por 1 hora (saldo muda mais) */
  ACCOUNTS: 60 * 60 * 1,
  /** Categorias: cache por 24 horas (raramente mudam) */
  CATEGORIES: 60 * 60 * 24,
  /** Resposta stale (API caiu): nao expira automaticamente, tem TTL proprio */
  STALE_FALLBACK: 60 * 60 * 72, // 72 horas como backup de emergencia
} as const;

/**
 * Gera uma chave de cache unica baseada no endpoint e query string.
 * Exemplo: "nibo:schedules/credit:$filter=dueDate+ge+2026-01-01&$top=500&$skip=0"
 */
export function buildCacheKey(endpoint: string, queryString: string, companyId = 'default'): string {
  const cleanQuery = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  return cleanQuery
    ? `nibo:${companyId}:${endpoint}:${cleanQuery}`
    : `nibo:${companyId}:${endpoint}`;
}

/**
 * Chave especial para armazenar o ultimo dado valido (stale backup).
 * Usado quando a API do Nibo falha e precisamos servir o dado mais recente.
 */
export function buildStaleCacheKey(endpoint: string, queryString: string, companyId = 'default'): string {
  return `stale:${buildCacheKey(endpoint, queryString, companyId)}`;
}

/** Verifica se um endpoint deve ser cacheado */
export function shouldCache(endpoint: string): boolean {
  const CACHEABLE_PREFIXES = [
    'schedules/credit',
    'schedules/debit',
    'accounts',
    'schedules/categories',
    'costcenters',
    'stakeholders',
  ];
  return CACHEABLE_PREFIXES.some((prefix) => endpoint.startsWith(prefix));
}

/** Retorna o TTL correto para cada endpoint */
export function getTTL(endpoint: string): number {
  if (endpoint.startsWith('accounts')) return CACHE_TTL.ACCOUNTS;
  if (endpoint.startsWith('schedules/categories')) return CACHE_TTL.CATEGORIES;
  if (endpoint.startsWith('costcenters')) return CACHE_TTL.CATEGORIES;
  return CACHE_TTL.SCHEDULES;
}
