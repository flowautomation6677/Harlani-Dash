const MONTH_ABBR_PT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export function getCurrentMonthAbbr(): string {
  return MONTH_ABBR_PT[new Date().getMonth()];
}

export function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Aceita três formatos de "chave" de bucket: dia (YYYY-MM-DD), mês (YYYY-MM)
// ou abreviação de mês em pt-BR (ex. "SET", como niboClient.ts já formata as
// séries mensais) — e diz se esse bucket é o dia/mês ainda em andamento hoje.
export function isCurrentBucket(key: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return key === getTodayKey();
  if (/^\d{4}-\d{2}$/.test(key)) {
    const now = new Date();
    return key === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  return key.toUpperCase() === getCurrentMonthAbbr();
}

// Um gráfico de série temporal cujo último ponto é o período ainda em
// andamento (mês ou dia corrente) sempre "despenca" visualmente, porque esse
// ponto tem menos dados acumulados que os anteriores, já fechados — não é uma
// queda real. Devolve o índice desse último ponto quando ele for parcial, ou
// null quando toda a série já está fechada.
export function getPartialIndex<T>(items: readonly T[], getKey: (item: T) => string): number | null {
  if (items.length === 0) return null;
  const lastIndex = items.length - 1;
  return isCurrentBucket(getKey(items[lastIndex])) ? lastIndex : null;
}

// Duplica os campos numéricos indicados em `<campo>Parcial`, de forma que o
// segmento entre o último ponto fechado e o ponto parcial possa ser desenhado
// com um estilo visual diferente (tracejado, opacidade menor) sem deixar um
// buraco no gráfico. O campo original fica nulo no ponto parcial, para a série
// "fechada" parar de desenhar exatamente onde a parcial começa.
export function withPartialSplit<T extends Record<string, any>>(
  series: readonly T[],
  valueKeys: string[],
  partialIndex: number | null
): T[] {
  if (partialIndex === null) return series.map(item => ({ ...item }));

  return series.map((item, idx) => {
    const out: Record<string, any> = { ...item };
    valueKeys.forEach(key => {
      const partialKey = `${key}Parcial`;
      if (idx === partialIndex - 1 || idx === partialIndex) {
        out[partialKey] = item[key];
      } else {
        out[partialKey] = null;
      }
      if (idx === partialIndex) {
        out[key] = null;
      }
    });
    return out as T;
  });
}
