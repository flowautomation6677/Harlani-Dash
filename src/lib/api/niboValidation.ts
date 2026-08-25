/**
 * niboValidation.ts
 *
 * Utilitarios de validacao defensiva dos dados brutos retornados pela API Nibo.
 *
 * Abordagem: se 1 dos 200 agendamentos vier com um campo invalido,
 * os outros 199 continuam funcionando normalmente. O dashboard nunca quebra.
 * O erro aparece no console com informacoes suficientes para diagnostico rapido.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Logger de erros de validacao
// ---------------------------------------------------------------------------

/**
 * Formata e exibe no console um erro de validacao Zod com contexto util.
 * Em producao, esses logs podem ser enviados para um servico de monitoramento.
 */
export function logValidationError(
  endpoint: string,
  rawItem: unknown,
  error: z.ZodError
): void {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(raiz)';
    return `  - "${path}": ${issue.message} (received: ${JSON.stringify((rawItem as Record<string, unknown>)?.[issue.path[0] as string] ?? 'undefined')})`;
  });

  console.warn(
    `[Zod/Nibo] ⚠️ Contrato invalido em ${endpoint}:\n${issues.join('\n')}\n`,
    'Item rejeitado:',
    rawItem
  );
}

// ---------------------------------------------------------------------------
// Funcao principal de validacao em lote
// ---------------------------------------------------------------------------

/**
 * Valida um array de itens brutos contra um schema Zod.
 *
 * - Itens validos: retornados com tipo seguro inferido pelo Zod.
 * - Itens invalidos: descartados silenciosamente para o usuario, mas
 *   logados no console com detalhes para o desenvolvedor.
 *
 * @param rawItems   Array de itens brutos (any[]) retornados pela API
 * @param schema     Schema Zod para validar cada item
 * @param endpoint   Nome do endpoint (para mensagens de log)
 * @returns          Array filtrado com apenas os itens validos e tipados
 */
export function validateAndFilterItems<T extends z.ZodTypeAny>(
  rawItems: unknown[],
  schema: T,
  endpoint: string
): z.infer<T>[] {
  const valid: z.infer<T>[] = [];
  let invalidCount = 0;

  for (const raw of rawItems) {
    const result = schema.safeParse(raw);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalidCount++;
      logValidationError(endpoint, raw, result.error);
    }
  }

  if (invalidCount > 0) {
    console.warn(
      `[Zod/Nibo] ⚠️ ${invalidCount} item(ns) invalido(s) descartado(s) de "${endpoint}". ` +
      `${valid.length} item(ns) valido(s) processado(s).`
    );
  }

  return valid;
}

// ---------------------------------------------------------------------------
// Funcao de validacao unitaria (para um unico item)
// ---------------------------------------------------------------------------

/**
 * Valida um unico item bruto. Retorna o item tipado ou null se invalido.
 * Util para validar objetos como contas bancarias individuais.
 */
export function validateItem<T extends z.ZodTypeAny>(
  raw: unknown,
  schema: T,
  endpoint: string
): z.infer<T> | null {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  logValidationError(endpoint, raw, result.error);
  return null;
}
