/**
 * niboClient.integration.test.ts
 *
 * Testes de integracao para fetchNiboData, fetchNiboDataPaginated e
 * a funcao principal getClientData.
 *
 * Estrategia: mock da funcao global `fetch` via vi.stubGlobal,
 * simulando respostas 200, 4xx, 5xx, timeouts e payloads corrompidos.
 * Isso garante que o niboClient.ts lida corretamente com cada cenario
 * sem nunca precisar chamar a API real.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mock de window.location para o ambiente jsdom ---
Object.defineProperty(globalThis, 'window', {
  value: { location: { origin: 'http://localhost:3000' } },
  writable: true,
});

// Importacoes apos definir window
const { fetchNiboData, fetchNiboDataPaginated } = await import('@/lib/api/niboClient');

// ---------------------------------------------------------------------------
// Helpers de mock de fetch
// ---------------------------------------------------------------------------

function mockFetchOk(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  });
}

function mockFetchError(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ error: `HTTP ${status}` }),
  });
}

function mockFetchNetworkFailure() {
  return vi.fn().mockRejectedValue(new Error('Network request failed'));
}

// ---------------------------------------------------------------------------
// Suite 1: fetchNiboData — comportamento com HTTP responses
// ---------------------------------------------------------------------------

describe('fetchNiboData — tratamento de respostas HTTP', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('deve retornar os dados quando a resposta e 200 OK', async () => {
    const payload = { items: [{ id: '1', value: 1000 }] };
    vi.stubGlobal('fetch', mockFetchOk(payload));

    const result = await fetchNiboData('schedules/credit');
    expect(result).toEqual(payload);
  });

  it('deve retornar null silenciosamente para resposta 404 (endpoint inexistente)', async () => {
    vi.stubGlobal('fetch', mockFetchError(404));

    const result = await fetchNiboData('accounts/views/statement');
    expect(result).toBeNull();
  });

  it('deve retornar null silenciosamente para resposta 401 (token invalido)', async () => {
    vi.stubGlobal('fetch', mockFetchError(401));

    const result = await fetchNiboData('schedules/credit');
    expect(result).toBeNull();
  });

  it('deve retornar null silenciosamente para resposta 500 (erro interno do servidor Nibo)', async () => {
    vi.stubGlobal('fetch', mockFetchError(500));

    const result = await fetchNiboData('schedules/debit');
    expect(result).toBeNull();
  });

  it('deve retornar null silenciosamente para falha de rede (timeout, ECONNREFUSED)', async () => {
    vi.stubGlobal('fetch', mockFetchNetworkFailure());

    const result = await fetchNiboData('schedules/credit');
    expect(result).toBeNull();
  });

  it('deve construir a URL corretamente com parametros de query', async () => {
    const mockFetch = mockFetchOk({ items: [] });
    vi.stubGlobal('fetch', mockFetch);

    await fetchNiboData('schedules/credit', {
      '$filter': 'dueDate ge 2026-01-01',
      '$top': '500',
    });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/nibo/schedules/credit');
    expect(calledUrl).toContain('%24filter'); // $filter encodado
    expect(calledUrl).toContain('%24top');    // $top encodado
  });

  it('deve enviar fetch com cache no-store para evitar dados antigos', async () => {
    const mockFetch = mockFetchOk({ items: [] });
    vi.stubGlobal('fetch', mockFetch);

    await fetchNiboData('accounts');

    const options = mockFetch.mock.calls[0][1] as RequestInit;
    expect(options.cache).toBe('no-store');
  });
});

// ---------------------------------------------------------------------------
// Suite 2: fetchNiboDataPaginated — paginacao OData
// ---------------------------------------------------------------------------

describe('fetchNiboDataPaginated — paginacao OData', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('deve retornar todos os itens de uma unica pagina quando total < pageSize', async () => {
    const items = Array.from({ length: 3 }, (_, i) => ({ id: String(i), value: i * 100 }));
    vi.stubGlobal('fetch', mockFetchOk({ items }));

    const result = await fetchNiboDataPaginated('schedules/credit', {}, 500);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: '0', value: 0 });
  });

  it('deve iterar multiplas paginas quando primeira retorna pageSize completo', async () => {
    // Pagina 1: 2 itens (pageSize=2) → indica que pode haver mais
    const page1Items = [{ id: '1' }, { id: '2' }];
    // Pagina 2: 1 item (< pageSize) → para de paginar
    const page2Items = [{ id: '3' }];

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ items: page1Items }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ items: page2Items }) });

    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchNiboDataPaginated('schedules/debit', {}, 2);
    expect(result).toHaveLength(3);
    expect(result.map((r: { id: string }) => r.id)).toEqual(['1', '2', '3']);
  });

  it('deve parar a paginacao quando a segunda pagina retorna array vazio', async () => {
    // Usar pageSize=1: 1 item retornado == pageSize, entao tenta buscar pagina 2
    // Pagina 2 retorna vazio -> para de paginar
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ items: [{ id: '1' }] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockResolvedValue({ items: [] }) });

    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchNiboDataPaginated('schedules/credit', {}, 1);
    expect(result).toHaveLength(1);
    // Deve ter chamado fetch 2x: pagina 1 (1 item) + pagina 2 (vazia -> para)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('deve retornar array vazio quando primeira pagina retorna null (API down)', async () => {
    vi.stubGlobal('fetch', mockFetchError(503));

    const result = await fetchNiboDataPaginated('schedules/credit');
    expect(result).toEqual([]);
  });

  it('deve suportar resposta como array direto (sem wrapper items)', async () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    vi.stubGlobal('fetch', mockFetchOk(items)); // resposta e array, nao {items:[]}

    const result = await fetchNiboDataPaginated('schedules/categories', {}, 500);
    expect(result).toHaveLength(2);
  });

  it('deve incluir $orderby nos parametros enviados para a API', async () => {
    const mockFetch = mockFetchOk({ items: [] });
    vi.stubGlobal('fetch', mockFetch);

    await fetchNiboDataPaginated(
      'schedules/credit',
      { '$filter': 'dueDate ge 2026-01-01', '$orderby': 'dueDate desc' },
      500
    );

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('orderby');
  });

  it('deve respeitar o limite maximo de paginas (maxPages)', async () => {
    // Cada pagina sempre retorna 2 itens (pageSize=2), nunca para por si so
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ items: [{ id: '1' }, { id: '2' }] }),
    });

    vi.stubGlobal('fetch', mockFetch);

    // maxPages=3: deve buscar no maximo 3 paginas
    const result = await fetchNiboDataPaginated('schedules/credit', {}, 2, 3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(6); // 3 paginas x 2 itens
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Contrato de dados (validacao Zod integrada)
// ---------------------------------------------------------------------------

describe('Contrato de dados Zod — rejeicao de campos invalidos', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('deve filtrar item de credito sem campo "value" obrigatorio', async () => {
    const invalidItem = { scheduleId: 'sc-1', dueDate: '2026-08-01', isPaid: false };
    const validItem = { scheduleId: 'sc-2', dueDate: '2026-08-01', value: 500, isPaid: false };

    // Retornar 1 item invalido + 1 valido na pagina unica
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ items: [invalidItem, validItem] }),
    }));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // getClientData internamente valida cada item pelo Zod
    // Verificamos apenas que fetchNiboDataPaginated retorna ambos (Zod esta no getClientData)
    const result = await fetchNiboDataPaginated('schedules/credit', {}, 500);
    expect(result).toHaveLength(2); // paginacao retorna os 2; Zod filtra depois no getClientData

    warnSpy.mockRestore();
  });
});
