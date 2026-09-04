/**
 * dashboardBalance.test.tsx
 *
 * Trava a regra: "Saldo em Conta" no dashboard principal (src/app/page.tsx)
 * e uma variavel de ESTOQUE (posicao consolidada ate hoje, vinda de
 * data.metrics.saldoAtual em niboClient.ts) e NAO PODE mudar so porque o
 * usuario troca a aba de periodo (Mes Atual/Trimestre/Ano/Personalizado).
 *
 * Bug original: o useMemo de computedMetrics somava de novo o fluxo pago do
 * periodo filtrado em cima do saldoAtual, que ja cobria esse mesmo fluxo —
 * dupla contagem sempre que a janela selecionada se sobrepunha ao intervalo
 * ja embutido no saldo (ex: aba "Ano" == mesmo range usado em getClientData).
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// O grafico de fluxo de caixa nao e o objeto deste teste — stub leve evita
// lidar com SVG/dimensoes do Recharts dentro do jsdom.
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

// vi.mock e hoisted para o topo do arquivo — qualquer valor usado dentro do
// factory precisa vir de vi.hoisted() para nao virar TDZ.
const { SALDO_ATUAL_FIXO, mockTransactions, currentYear } = vi.hoisted(() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const saldo = 118743.95;

  // Transacoes deliberadamente espalhadas por meses diferentes do ano, para
  // que o filtro de periodo (Mes Atual vs Ano) produza subconjuntos `txs`
  // diferentes — e assim expor a dupla contagem caso ela volte a existir.
  const txs = [
    {
      id: '1', description: 'Recebimento mes atual', value: 5000, date: `${year}-${month}-05`,
      dueDate: `${year}-${month}-05`, type: 'receita', status: 'pago',
      category: 'Vendas', clientSupplier: 'Cliente A', documentNumber: 'DOC-1'
    },
    {
      id: '2', description: 'Pagamento mes atual', value: 2000, date: `${year}-${month}-06`,
      dueDate: `${year}-${month}-06`, type: 'despesa', status: 'pago',
      category: 'Despesas Gerais', clientSupplier: 'Fornecedor A', documentNumber: 'DOC-2'
    },
    {
      id: '3', description: 'Recebimento inicio do ano', value: 30000, date: `${year}-01-10`,
      dueDate: `${year}-01-10`, type: 'receita', status: 'pago',
      category: 'Vendas', clientSupplier: 'Cliente B', documentNumber: 'DOC-3'
    },
    {
      id: '4', description: 'Pagamento inicio do ano', value: 12000, date: `${year}-01-15`,
      dueDate: `${year}-01-15`, type: 'despesa', status: 'pago',
      category: 'Despesas Gerais', clientSupplier: 'Fornecedor B', documentNumber: 'DOC-4'
    },
  ];

  return { SALDO_ATUAL_FIXO: saldo, mockTransactions: txs, currentYear: year };
});

vi.mock('@/lib/api/niboClient', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/api/niboClient')>();
  return {
    ...actual,
    getClientData: vi.fn().mockResolvedValue({
      metrics: {
        saldoAtual: SALDO_ATUAL_FIXO,
        receberMes: 1000,
        pagarMes: 500,
        ticketMedio: 100,
        taxaInadimplencia: 5,
        margemOperacional: 20,
        previsao30dias: SALDO_ATUAL_FIXO + 500
      },
      cashFlow: [],
      transactions: mockTransactions
    }),
    getBankAccounts: vi.fn().mockResolvedValue([]),
    getCostCenters: vi.fn().mockResolvedValue([]),
    getLiquidityRunway: vi.fn().mockResolvedValue([]),
    getFinancialHealthAnalysis: vi.fn().mockResolvedValue({
      ebitda: 0,
      margemEbitda: 0,
      jurosFinanceiro: 0,
      impostos: 0,
      depreciacaoAmortizacao: 0,
      lucroLiquido: 0,
      breakEven: {
        fixedExpenses: 0,
        variableExpenses: 0,
        totalRevenue: 0,
        contributionMarginValue: 0,
        contributionMarginPercent: 0,
        breakEvenPoint: 0,
        safetyMarginValue: 0,
        safetyMarginPercent: 0,
        monthlyBreakdown: []
      },
      ebitdaEvolution: []
    })
  };
});

import DashboardPage from '@/app/page';
import { CompanyProvider } from '@/context/CompanyContext';

function getSaldoEmContaText(): string {
  const label = screen.getByText('SALDO EM CONTA');
  const card = label.closest('.card');
  if (!card) throw new Error('Card "SALDO EM CONTA" nao encontrado no DOM');
  const value = card.querySelector('.text-2xl');
  if (!value?.textContent) throw new Error('Valor de saldo nao encontrado dentro do card');
  return value.textContent;
}

describe('Dashboard — Saldo em Conta e uma variavel de estoque, independente do periodo', () => {
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('mantem o mesmo valor de Saldo em Conta ao trocar entre as 4 abas de periodo', async () => {
    const user = userEvent.setup();
    render(
      <CompanyProvider>
        <DashboardPage />
      </CompanyProvider>
    );

    await waitFor(() => expect(screen.getByText('SALDO EM CONTA')).toBeInTheDocument());

    const valorEsperado = `R$ ${SALDO_ATUAL_FIXO.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    // Mes Atual (tab padrao)
    expect(getSaldoEmContaText()).toBe(valorEsperado);

    // Trimestre
    await user.click(screen.getByRole('button', { name: 'Trimestre' }));
    expect(getSaldoEmContaText()).toBe(valorEsperado);

    // Ano — a aba que originalmente expunha a dupla contagem, por cobrir o
    // mesmo intervalo ja embutido em data.metrics.saldoAtual
    await user.click(screen.getByRole('button', { name: new RegExp(`Ano ${currentYear}`) }));
    expect(getSaldoEmContaText()).toBe(valorEsperado);

    // Personalizado
    await user.click(screen.getByRole('button', { name: 'Personalizado' }));
    expect(getSaldoEmContaText()).toBe(valorEsperado);
  });
});
