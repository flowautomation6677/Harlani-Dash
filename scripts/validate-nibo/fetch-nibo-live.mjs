// scripts/validate-nibo/fetch-nibo-live.mjs
//
// Busca os dados de agendamentos (credit + debit) DIRETO da API do Nibo,
// sem passar pelo proxy/cache do app. Isso é a "camada A" — a verdade.
//
// Uso:
//   node --env-file=.env.local scripts/validate-nibo/fetch-nibo-live.mjs
//
// Requer no .env.local: NIBO_API_TOKEN_CLIENT_2 (token da Cursos GHF)

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const NIBO_API_URL = process.env.NIBO_API_URL || 'https://api.nibo.com.br/empresas/v1';
const TOKEN = process.env.NIBO_API_TOKEN_CLIENT_2;
const OUT_DIR = path.join(process.cwd(), 'scripts', 'validate-nibo', 'output');

if (!TOKEN) {
  console.error('NIBO_API_TOKEN_CLIENT_2 não encontrado no ambiente. Confira o .env.local.');
  process.exit(1);
}

// Intervalo amplo pra pegar "todos os dados" (histórico + futuro provisionado).
const DATE_FROM = '2015-01-01T00:00:00Z';

async function fetchAllPages(endpoint) {
  const items = [];
  let skip = 0;
  const top = 500;

  for (;;) {
    const qs = new URLSearchParams({
      '$filter': `dueDate ge ${DATE_FROM}`,
      '$orderby': 'dueDate asc',
      '$top': String(top),
      '$skip': String(skip),
    });
    const url = `${NIBO_API_URL}/${endpoint}?${qs.toString()}`;

    const res = await fetch(url, {
      headers: { apitoken: TOKEN, 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Nibo API ${endpoint} respondeu ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const page = data.items || [];
    items.push(...page);
    console.log(`  ${endpoint}: página skip=${skip} trouxe ${page.length} registro(s) (total até agora: ${items.length})`);

    if (page.length < top) break;
    skip += top;
  }

  return items;
}

async function main() {
  console.log('Buscando dados AO VIVO do Nibo para Cursos GHF (companyId=2)...\n');

  console.log('Contas a Receber (credit):');
  const credit = await fetchAllPages('schedules/credit');

  console.log('\nContas a Pagar (debit):');
  const debit = await fetchAllPages('schedules/debit');

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'nibo-live-2.json');
  await writeFile(
    outPath,
    JSON.stringify({ fetchedAt: new Date().toISOString(), companyId: '2', credit, debit }, null, 2),
    'utf-8'
  );

  console.log(`\nOK — ${credit.length} credit + ${debit.length} debit salvos em:`);
  console.log(outPath);
}

try {
  await main();
} catch (err) {
  console.error('Falhou:', err.message);
  process.exit(1);
}
