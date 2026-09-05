/**
 * contasReceberPagar.test.tsx
 *
 * Trava a regra: os cards "Contas a Receber" e "Contas a Pagar" do dashboard
 * principal (src/app/(app)/dashboard/page.tsx) devem sempre exibir, como
 * valor PRINCIPAL, o total de pendentes do PERÍODO filtrado — inclusive
 * quando esse total é R$ 0,00 — e nunca cair de volta para o total geral da
 * empresa como se fosse o número do período.
 *
 * Bug original: `receberMes: receitasPendentes > 0 ? receitasPendentes :
 * data.metrics.receberMes` trocava silenciosamente o valor do período pelo
 * total geral sempre que a janela escolhida não tinha nenhuma pendência,
 * sem qualquer indicação visual de que o número mudou de fonte.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  Legend: () => null,
}));

const { TOTAL_GERAL_RECEBER, TOTAL_GERAL_PAGAR, mockTransactions } = vi.hoisted(() => {
  // Total geral pendente da empresa inteira — bem maior que qualquer
  // pendência isolada no período de teste, para deixar óbvio se o fallback
  // antigo (mostrar o total geral como se fosse o valor do período) voltar.
  const totalReceber = 356902.0;
  const totalPagar = 92574.84;

  const txs = [
    // Fora da janela "sem pendências" (2026-01-06 a 2026-01-07), mas dentro
    // da janela "com pendências" (2026-02-01 a 2026-02-28).
    {
      id: '1', description: 'Recebimento pendente em fevereiro', value: 4200,
      date: '2026-02-10', dueDate: '2026-02-10', type: 'receita', status: 'pendente',
      category: 'Vendas', clientSupplier: 'Cliente A', documentNumber: 'DOC-1'
    },
    {
      id: '2', description: 'Pagamento pendente em fevereiro', value: 1800,
      date: '2026-02-12', dueDate: '2026-02-12', type: 'despesa', status: 'pendente',
      category: 'Despesas Gerais', clientSupplier: 'Fornecedor A', documentNumber: 'DOC-2'
    },
  ];

  return { TOTAL_GERAL_RECEBER: totalReceber, TOTAL_GERAL_PAGAR: totalPagar, mockTransactions: txs };
});

vi.mock('@/lib/api/niboClient', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/api/niboClient')>();
  return {
    ...actual,
    getClientData: vi.fn().mockResolvedValue({
      metrics: {
        saldoAtual: 50000,
        receberMes: TOTAL_GERAL_RECEBER,
        pagarMes: TOTAL_GERAL_PAGAR,
        ticketMedio: 100,
        taxaInadimplencia: 5,
        margemOperacional: 20,
        previsao30dias: 50000
      },
      cashFlow: [],
      transactions: mockTransactions
    }),
    getBankAccounts: vi.fn().mockResolvedValue([]),
    getCostCenters: vi.fn().mockResolvedValue([]),
    getLiquidityRunway: vi.fn().mockResolvedValue([]),
    getFinancialHealthAnalysis: vi.fn().mockResolvedValue({
      ebitda: 0, margemEbitda: 0, jurosFinanceiro: 0, impostos: 0,
      depreciacaoAmortizacao: 0, lucroLiquido: 0,
      breakEven: {
        fixedExpenses: 0, variableExpenses: 0, totalRevenue: 0,
        contributionMarginValue: 0, contributionMarginPercent: 0,
        breakEvenPoint: 0, safetyMarginValue: 0, safetyMarginPercent: 0,
        monthlyBreakdown: []
      },
      ebitdaEvolution: []
    })
  };
});

import DashboardPage from '@/app/(app)/dashboard/page';
import { CompanyProvider } from '@/context/CompanyContext';

function getCardValue(cardLabel: string): string {
  const label = screen.getByText(cardLabel);
  const card = label.closest('.card');
  if (!card) throw new Error(`Card "${cardLabel}" nao encontrado no DOM`);
  const value = card.querySelector('.text-2xl');
  if (!value?.textContent) throw new Error(`Valor principal nao encontrado no card "${cardLabel}"`);
  return value.textContent;
}

function getCardTotalGeral(cardLabel: string): string {
  const label = screen.getByText(cardLabel);
  const card = label.closest('.card');
  if (!card) throw new Error(`Card "${cardLabel}" nao encontrado no DOM`);
  const totalLabel = Array.from(card.querySelectorAll('span')).find(el => el.textContent === 'Total em aberto:');
  if (!totalLabel?.nextElementSibling?.textContent) {
    throw new Error(`Linha "Total em aberto" nao encontrada no card "${cardLabel}"`);
  }
  return totalLabel.nextElementSibling.textContent;
}

async function setCustomRange(user: ReturnType<typeof userEvent.setup>, start: string, end: string) {
  await user.click(screen.getByRole('button', { name: 'Personalizado' }));
  // Os dois <input type="date"> do range picker só existem no DOM depois do clique acima.
  const inputs = document.querySelectorAll('input[type="date"]');
  fireEvent.change(inputs[0], { target: { value: start } });
  fireEvent.change(inputs[1], { target: { value: end } });
}

describe('Dashboard — Contas a Receber / Contas a Pagar nunca trocam o valor do período pelo total geral', () => {
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('mostra R$ 0,00 como valor principal quando não há pendências no período, com o total geral só na linha secundária', async () => {
    const user = userEvent.setup();
    render(
      <CompanyProvider>
        <DashboardPage />
      </CompanyProvider>
    );

    await waitFor(() => expect(screen.getByText('A RECEBER NO PERÍODO')).toBeInTheDocument());

    await setCustomRange(user, '2026-01-06', '2026-01-07');

    await waitFor(() => {
      expect(getCardValue('A RECEBER NO PERÍODO')).toBe('R$ 0,00');
      expect(getCardValue('A PAGAR NO PERÍODO')).toBe('R$ 0,00');
    });

    expect(getCardTotalGeral('A RECEBER NO PERÍODO')).toBe(
      `R$ ${TOTAL_GERAL_RECEBER.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    );
    expect(getCardTotalGeral('A PAGAR NO PERÍODO')).toBe(
      `R$ ${TOTAL_GERAL_PAGAR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    );
  });

  it('mostra o valor real do período como principal quando existem pendências nele, mantendo o total geral na linha secundária', async () => {
    const user = userEvent.setup();
    render(
      <CompanyProvider>
        <DashboardPage />
      </CompanyProvider>
    );

    await waitFor(() => expect(screen.getByText('A RECEBER NO PERÍODO')).toBeInTheDocument());

    await setCustomRange(user, '2026-02-01', '2026-02-28');

    await waitFor(() => {
      expect(getCardValue('A RECEBER NO PERÍODO')).toBe('R$ 4.200,00');
      expect(getCardValue('A PAGAR NO PERÍODO')).toBe('R$ 1.800,00');
    });

    expect(getCardTotalGeral('A RECEBER NO PERÍODO')).toBe(
      `R$ ${TOTAL_GERAL_RECEBER.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    );
    expect(getCardTotalGeral('A PAGAR NO PERÍODO')).toBe(
      `R$ ${TOTAL_GERAL_PAGAR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    );
  });

  it('Índice de Liquidez não muda ao trocar de período — é uma foto do balanço (total geral), não do fluxo do período', async () => {
    const user = userEvent.setup();
    render(
      <CompanyProvider>
        <DashboardPage />
      </CompanyProvider>
    );

    function getLiquidezText(): string {
      const label = screen.getByText('ÍNDICE DE LIQUIDEZ');
      const row = label.closest('div')?.parentElement;
      const value = row?.querySelector('.text-base');
      if (!value?.textContent) throw new Error('Valor do Índice de Liquidez não encontrado');
      return value.textContent;
    }

    await waitFor(() => expect(screen.getByText('ÍNDICE DE LIQUIDEZ')).toBeInTheDocument());
    const valorMesAtual = getLiquidezText();

    // Personalizado sem nenhuma pendência no período (troca o fluxo do
    // período pra 0/0, mas o total geral em aberto continua o mesmo).
    await setCustomRange(user, '2026-01-06', '2026-01-07');
    await waitFor(() => expect(getCardValue('A RECEBER NO PERÍODO')).toBe('R$ 0,00'));
    expect(getLiquidezText()).toBe(valorMesAtual);

    // Personalizado com pendências reais no período (fluxo do período > 0).
    await setCustomRange(user, '2026-02-01', '2026-02-28');
    await waitFor(() => expect(getCardValue('A RECEBER NO PERÍODO')).toBe('R$ 4.200,00'));
    expect(getLiquidezText()).toBe(valorMesAtual);
  });
});
