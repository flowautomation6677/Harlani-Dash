---
description: Audita via Playwright a UI da página principal do dashboard e a origem/coerência de cada dado exibido
---

# Auditoria de UI e Dados — Página Principal (Harlani Dashboard)

Você vai usar Playwright para inspecionar a página principal do dashboard (`src/app/page.tsx`, rota `/`) rodando de verdade no navegador, e produzir um relatório que responde, para CADA dado visível na tela: **o que é, de onde vem no código, por que aparece com aquele valor, e se isso é o dado "ideal" (correto/coerente) para ser mostrado ali.**

Não é uma auditoria visual de layout (isso já é coberto por outros fluxos) — o foco aqui é **dado exibido vs. dado correto**.

## 1. Preparação

- Confirme que o servidor dev está rodando em `http://localhost:3000` (o `playwright.config.ts` já sobe via `npm run dev` se necessário — não precisa subir manualmente).
- Use o Playwright MCP/CLI disponível no ambiente (ou escreva um script temporário em `e2e/` se for mais prático) para navegar e extrair dados reais do DOM — não infira valores só pela captura visual do screenshot, leia o texto renderizado (`page.locator(...).innerText()`, `getByText`, etc).
- Rode para pelo menos 2 combinações de contexto, já que o dashboard é multi-tenant e multi-período:
  - Cada empresa disponível no `<select>` do header (`header select`).
  - Cada aba de período (`Mês Atual`, `Trimestre`, `Ano <atual>`, `Personalizado`).
- Tire um screenshot de página inteira por combinação relevante, salvando em `test-results/` ou no scratchpad, para anexar ao relatório.

## 2. Dados a extrair e auditar

Para cada elemento abaixo, capture o valor exibido, identifique a linha exata em `page.tsx` (ou no client Nibo em `src/lib/api/niboClient.ts`) de onde ele vem, e julgue se está correto:

| Bloco na UI | O que checar |
|---|---|
| **Header da empresa** (nome, CNPJ, badge "Conexão Nibo API: Ativa") | O status "Ativa" é dinâmico (reflete uma falha real de fetch) ou está fixo no JSX independente do resultado da chamada? |
| **Cards de KPI** (Saldo, A Receber, A Pagar, Margem Operacional, Inadimplência) | Os valores mudam de fato ao trocar o filtro de período? Confirme comparando o texto capturado antes/depois de trocar de aba. `taxaInadimplencia` e `margemOperacional` vêm direto de `data.metrics` sem recálculo por período (ver `page.tsx:169-170`) — isso é aceitável ou deveria refletir o período filtrado? |
| **Widget de Contas Bancárias** | A soma dos saldos das contas bate com o "Saldo em Conta" do card 1? Se não bater, investigue e explique a diferença (ex: contas não operacionais, período de abertura). |
| **Gráfico de Fluxo de Caixa** | O último ponto do período corrente aparece tracejado/com opacidade reduzida (indicando dado parcial)? Os valores do tooltip batem com a soma das transações filtradas visíveis na tabela abaixo? |
| **Painel "Saúde Financeira"** (Índice de Liquidez, Runway Estimado, Ponto de Equilíbrio, "Última sincronização") | **Ponto crítico**: `Índice de Liquidez "2.28 (Excelente)"`, `Runway "8.4 Meses"` e `"Última sincronização: Hoje às 23:48"` (`page.tsx:769,777,795`) parecem strings fixas no JSX, não calculadas a partir de `computedMetrics` ou de um timestamp real. Confirme trocando de empresa/período: se os números NÃO mudam mesmo quando os outros KPIs mudam, é um dado mockado sendo apresentado como se fosse ao vivo — reporte como achado de alta severidade (dado enganoso para o usuário final, que é quem toma decisão financeira em cima disso). Também avalie o "Ponto de Equilíbrio" = `pagarMes * 1.15`: é uma heurística arbitrária sem explicação visível na UI — o badge "Alcançado" está sempre fixo, mesmo que o valor calculado mude? |
| **Tabela de Lançamentos** | O contador "Mostrando N registros" bate com o número real de linhas renderizadas? Os badges de status (Pago/Pendente/Atrasado) e a tag "Não operacional" condizem com os campos `status`/`tag` de cada transação? |

## 3. Critérios para julgar um dado como "ideal"

Um dado exibido é considerado correto/ideal quando:
1. **É dinâmico de fato** — reage a mudanças de empresa/período/dados, em vez de ser uma constante disfarçada de métrica.
2. **É rastreável** — dá para apontar exatamente de qual campo da API Nibo ou de qual cálculo local ele vem.
3. **É consistente entre widgets** — dois lugares que deveriam refletir o mesmo número (ex: saldo total vs. soma das contas) batem, ou a diferença é explicada.
4. **Está formatado corretamente** — moeda em `pt-BR` com 2 casas decimais, datas no formato esperado, percentuais coerentes com a escala (0–100).
5. **Não engana o usuário** — badges/rótulos qualitativos ("Excelente", "Saudável", "Alcançado") realmente refletem o valor numérico ao lado, e não são sempre fixos.

## 4. Formato do relatório de retorno

Devolva uma tabela markdown com as colunas:

`Dado exibido | Valor capturado | Origem no código (arquivo:linha) | Por que aparece esse valor | Ideal? (Sim/Não/Parcial) | Observação`

Seguida de um resumo executivo (3–6 bullets) ordenado por severidade, destacando primeiro qualquer dado mockado/fixo apresentado como se fosse ao vivo, depois inconsistências entre widgets, depois problemas de formatação. Referencie sempre `arquivo:linha` para eu poder abrir direto.
