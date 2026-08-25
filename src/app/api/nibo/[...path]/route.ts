import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCached } from '@/lib/cache/redisClient';
import { buildCacheKey, buildStaleCacheKey, shouldCache, getTTL, CACHE_TTL } from '@/lib/cache/cacheKeys';

export const dynamic = 'force-dynamic';

const NIBO_API_URL = process.env.NIBO_API_URL || 'https://api.nibo.com.br/empresas/v1';
const NIBO_API_TOKEN = process.env.NIBO_API_TOKEN;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!NIBO_API_TOKEN || NIBO_API_TOKEN === 'COLE_SEU_TOKEN_AQUI') {
    return NextResponse.json({ error: 'Nibo API Token not configured.' }, { status: 500 });
  }

  const { path } = await params;
  const endpoint = path.join('/');
  const query = request.nextUrl.search || '';
  const targetUrl = `${NIBO_API_URL}/${endpoint}${query}`;

  // ------------------------------------------------------------------
  // Cache-aside pattern
  // Apenas endpoints financeiros sao cacheados (schedules, accounts...)
  // ------------------------------------------------------------------
  const cacheable = shouldCache(endpoint);
  const cacheKey = buildCacheKey(endpoint, query);
  const staleCacheKey = buildStaleCacheKey(endpoint, query);

  if (cacheable) {
    // 1. Tentar retornar do cache (CACHE HIT)
    const cached = await getCached<unknown>(cacheKey);
    if (cached !== null) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { 'X-Cache': 'HIT', 'X-Cache-Key': cacheKey },
      });
    }
  }

  // 2. Cache MISS — chamar a API do Nibo
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'apitoken': NIBO_API_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok && cacheable) {
      const ttl = getTTL(endpoint);
      // Salvar no cache principal (com TTL padrao do endpoint)
      await setCached(cacheKey, data, ttl);
      // Salvar copia stale como backup de emergencia (72h)
      await setCached(staleCacheKey, data, CACHE_TTL.STALE_FALLBACK);
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: cacheable ? { 'X-Cache': 'MISS' } : {},
    });

  } catch (error) {
    console.error('[Nibo Proxy] Erro ao chamar API Nibo:', error);

    // 3. API Nibo inacessivel — tentar servir dado stale do Redis
    if (cacheable) {
      const stale = await getCached<unknown>(staleCacheKey);
      if (stale !== null) {
        console.warn(`[Redis] ⚠️ API Nibo indisponivel. Servindo dado stale para "${endpoint}"`);
        return NextResponse.json(stale, {
          status: 200,
          headers: {
            'X-Cache': 'STALE',
            'X-Cache-Stale': 'true',
            'X-Cache-Warning': 'Nibo API unavailable — serving last known data',
          },
        });
      }
    }

    // 4. Sem cache disponivel — retornar erro claro
    return NextResponse.json(
      { error: 'Nibo API unavailable and no cached data found. Please try again later.' },
      { status: 503 }
    );
  }
}
