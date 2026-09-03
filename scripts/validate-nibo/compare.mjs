// scripts/validate-nibo/compare.mjs
//
// Compara os dumps gerados por fetch-nibo-live.mjs (camada A — verdade)
// e fetch-app-proxy.mjs (camada B — o que o app está servindo/cacheando)
// para o cliente Cursos GHF (companyId=2).
//
// Uso (depois de rodar os dois scripts de fetch):
//   node scripts/validate-nibo/compare.mjs

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'scripts', 'validate-nibo', 'output');

// Campos que importam pra reconciliação financeira. Ignoramos
// createDate/updateDate/updateUser etc — não indicam erro de dado.
const FIELDS_TO_COMPARE = [
  'isPaid',
  'dueDate',
  'accrualDate',
  'scheduleDate',
  'value',
  'paidValue',
  'openValue',
  'description',
];

function normalize(item, type) {
  return {
    scheduleId: item.scheduleId,
    type,
    isPaid: item.isPaid,
    dueDate: item.dueDate,
    accrualDate: item.accrualDate,
    scheduleDate: item.scheduleDate,
    value: item.value,
    paidValue: item.paidValue,
    openValue: item.openValue,
    description: item.description || '',
    stakeholder: item.stakeholder?.name || null,
    category: item.category?.name || item.categories?.[0]?.categoryName || null,
  };
}

function buildMap(dump) {
  const map = new Map();
  for (const item of dump.credit || []) {
    const n = normalize(item, 'Credit');
    map.set(n.scheduleId, n);
  }
  for (const item of dump.debit || []) {
    const n = normalize(item, 'Debit');
    map.set(n.scheduleId, n);
  }
  return map;
}

function sumOpenValue(dump, type) {
  const list = type === 'Credit' ? dump.credit : dump.debit;
  return (list || []).reduce((acc, it) => acc + (it.openValue ?? 0), 0);
}

async function main() {
  const livePath = path.join(OUT_DIR, 'nibo-live-2.json');
  const proxyPath = path.join(OUT_DIR, 'app-proxy-2.json');

  const live = JSON.parse(await readFile(livePath, 'utf-8'));
  const proxy = JSON.parse(await readFile(proxyPath, 'utf-8'));

  const liveMap = buildMap(live);
  const proxyMap = buildMap(proxy);

  const onlyInLive = [];
  const onlyInProxy = [];
  const diffs = [];
  const fieldDivergenceCount = {};

  for (const [id, liveRec] of liveMap) {
    const proxyRec = proxyMap.get(id);
    if (!proxyRec) {
      onlyInLive.push(liveRec);
      continue;
    }
    const changedFields = [];
    for (const field of FIELDS_TO_COMPARE) {
      if (liveRec[field] !== proxyRec[field]) {
        changedFields.push({ field, live: liveRec[field], proxy: proxyRec[field] });
        fieldDivergenceCount[field] = (fieldDivergenceCount[field] || 0) + 1;
      }
    }
    if (changedFields.length > 0) {
      diffs.push({
        scheduleId: id,
        type: liveRec.type,
        description: liveRec.description,
        stakeholder: liveRec.stakeholder,
        dueDate: liveRec.dueDate,
        changedFields,
      });
    }
  }

  for (const [id, proxyRec] of proxyMap) {
    if (!liveMap.has(id)) onlyInProxy.push(proxyRec);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    counts: {
      liveCredit: (live.credit || []).length,
      liveDebit: (live.debit || []).length,
      proxyCredit: (proxy.credit || []).length,
      proxyDebit: (proxy.debit || []).length,
      onlyInLive: onlyInLive.length,
      onlyInProxy: onlyInProxy.length,
      recordsWithFieldDiffs: diffs.length,
    },
    totals: {
      liveOpenValueCredit: sumOpenValue(live, 'Credit'),
      proxyOpenValueCredit: sumOpenValue(proxy, 'Credit'),
      liveOpenValueDebit: sumOpenValue(live, 'Debit'),
      proxyOpenValueDebit: sumOpenValue(proxy, 'Debit'),
    },
    fieldDivergenceCount,
    cacheStatusSeen: proxy.cacheStatus || null,
  };

  const report = { summary, onlyInLive, onlyInProxy, diffs };
  const reportPath = path.join(OUT_DIR, 'report-cursos-ghf.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  // ---- Resumo legível no console ----
  console.log('='.repeat(70));
  console.log('RELATÓRIO — Cursos GHF (companyId=2): Nibo ao vivo vs. proxy do app');
  console.log('='.repeat(70));
  console.log(`Registros — live: ${summary.counts.liveCredit} credit + ${summary.counts.liveDebit} debit`);
  console.log(`Registros — proxy: ${summary.counts.proxyCredit} credit + ${summary.counts.proxyDebit} debit`);
  console.log('');
  console.log(`Só existem no Nibo (faltando no cache do app): ${summary.counts.onlyInLive}`);
  console.log(`Só existem no cache do app (não estão mais no Nibo): ${summary.counts.onlyInProxy}`);
  console.log(`Registros com algum campo divergente: ${summary.counts.recordsWithFieldDiffs}`);
  console.log('');
  console.log('Divergência por campo:');
  for (const [field, count] of Object.entries(fieldDivergenceCount)) {
    console.log(`  - ${field}: ${count} registro(s)`);
  }
  console.log('');
  console.log('Totais (openValue):');
  console.log(`  A Receber — Nibo ao vivo: R$ ${summary.totals.liveOpenValueCredit.toFixed(2)} | App: R$ ${summary.totals.proxyOpenValueCredit.toFixed(2)}`);
  console.log(`  A Pagar   — Nibo ao vivo: R$ ${summary.totals.liveOpenValueDebit.toFixed(2)} | App: R$ ${summary.totals.proxyOpenValueDebit.toFixed(2)}`);
  console.log('');
  const cacheStatuses = new Set([...(proxy.cacheStatus?.credit || []), ...(proxy.cacheStatus?.debit || [])]);
  const hadStale = cacheStatuses.has('STALE');
  const hadHit = cacheStatuses.has('HIT');
  if (hadStale) console.log('⚠️  O app serviu dado STALE (Nibo indisponível no momento da consulta) em pelo menos uma página.');
  else if (hadHit) console.log('ℹ️  O app serviu pelo menos uma página do cache (HIT) — pode ter até 4h de defasagem em relação ao Nibo.');
  else console.log('✅ Nenhuma página veio do cache (tudo MISS) — os dados do app foram buscados ao vivo do Nibo nesta consulta.');
  console.log('');
  console.log(`Relatório completo salvo em: ${reportPath}`);
}

try {
  await main();
} catch (err) {
  console.error('Falhou:', err.message);
  process.exit(1);
}
