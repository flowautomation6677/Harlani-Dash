// scripts/validate-nibo/fetch-app-proxy.mjs
//
// Busca os mesmos dados (credit + debit) através do proxy do PRÓPRIO app
// (/api/nibo/...), passando pelo cache Upstash. Isso é a "camada B" —
// o que o app realmente está servindo pro frontend agora.
//
// Uso:
//   node scripts/validate-nibo/fetch-app-proxy.mjs
//
// Por padrão aponta pra produção (harlanidash.flowrocket.com.br).
// Pra testar contra o dev local, rode com:
//   APP_BASE_URL=http://localhost:3000 node scripts/validate-nibo/fetch-app-proxy.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.APP_BASE_URL || 'https://harlanidash.flowrocket.com.br';
const OUT_DIR = path.join(process.cwd(), 'scripts', 'validate-nibo', 'output');
const COMPANY_ID = '2'; // Cursos GHF
const DATE_FROM = '2015-01-01T00:00:00Z';

async function fetchAllPages(endpoint) {
  const items = [];
  const cacheStatuses = [];
  let skip = 0;
  const top = 500;

  for (;;) {
    const qs = new URLSearchParams({
      companyId: COMPANY_ID,
      '$filter': `dueDate ge ${DATE_FROM}`,
      '$orderby': 'dueDate asc',
      '$top': String(top),
      '$skip': String(skip),
    });
    const url = `${BASE_URL}/api/nibo/${endpoint}?${qs.toString()}`;

    const res = await fetch(url);
    const cacheHeader = res.headers.get('x-cache') || 'n/a';
    cacheStatuses.push(cacheHeader);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Proxy do app (${endpoint}) respondeu ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const page = data.items || [];
    items.push(...page);
    console.log(`  ${endpoint}: página skip=${skip} trouxe ${page.length} registro(s) [X-Cache: ${cacheHeader}] (total até agora: ${items.length})`);

    if (page.length < top) break;
    skip += top;
  }

  return { items, cacheStatuses };
}

async function main() {
  console.log(`Buscando dados via proxy do app (${BASE_URL}) para Cursos GHF (companyId=2)...\n`);

  console.log('Contas a Receber (credit):');
  const credit = await fetchAllPages('schedules/credit');

  console.log('\nContas a Pagar (debit):');
  const debit = await fetchAllPages('schedules/debit');

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'app-proxy-2.json');
  await writeFile(
    outPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        companyId: COMPANY_ID,
        baseUrl: BASE_URL,
        credit: credit.items,
        debit: debit.items,
        cacheStatus: { credit: credit.cacheStatuses, debit: debit.cacheStatuses },
      },
      null,
      2
    ),
    'utf-8'
  );

  const cacheList = [...credit.cacheStatuses, ...debit.cacheStatuses];
  const anyStale = cacheList.includes('STALE');
  const anyHit = cacheList.includes('HIT');

  console.log(`\nOK — ${credit.items.length} credit + ${debit.items.length} debit salvos em:`);
  console.log(outPath);
  if (anyStale) console.log('⚠️  Atenção: pelo menos uma página veio como STALE (Nibo indisponível no momento, servindo backup de 72h).');
  else if (anyHit) console.log('ℹ️  Pelo menos uma página veio do cache (X-Cache: HIT) — pode não refletir o Nibo em tempo real (TTL de até 4h).');
}

try {
  await main();
} catch (err) {
  console.error('Falhou:', err.message);
  process.exit(1);
}
