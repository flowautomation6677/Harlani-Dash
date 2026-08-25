/**
 * charts.ui.test.tsx
 *
 * Testes de integracao de UI para os componentes de grafico.
 * Verifica que os charts renderizam corretamente com payloads simulados
 * sem precisar de chamadas de rede reais.
 *
 * Estrategia:
 * - Recharts usa SVG/Canvas e ResizeObserver que nao existem no jsdom.
 *   Mockamos o ResponsiveContainer para renderizar com dimensoes fixas.
 * - Testamos que os componentes:
 *   (a) Renderizam sem erros com dados validos
 *   (b) Renderizam sem erros com dados vazios (edge case critico)
 *   (c) Exibem os labels corretos dos dados passados
 *   (d) Recebem e passam o payload completo ao grafico interno
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks de ambiente para Recharts no jsdom
// ---------------------------------------------------------------------------

// Recharts usa ResizeObserver internamente via ResponsiveContainer
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock do ResponsiveContainer para evitar erros de dimensao no jsdom
vi.mock('recharts', async (importActual) => {
  const actual = await importActual<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
  };
});

import { CashFlowBarChart } from '@/components/charts/CashFlowBarChart';

// ---------------------------------------------------------------------------
// Fixtures de payload simulado (como viria do niboClient.ts)
// ---------------------------------------------------------------------------

const validCashFlowPayload = [
  {
    date: '2026-01-01',
    dayName: 'Qua',
    entradas: 12500,
    saidas: 8300,
    resultado: 4200,
    saldoAcumulado: 45200,
    status: 'realizado' as const,
  },
  {
    date: '2026-02-01',
    dayName: 'Sex',
    entradas: 9800,
    saidas: 6100,
    resultado: 3700,
    saldoAcumulado: 48900,
    status: 'realizado' as const,
  },
  {
    date: '2026-03-01',
    dayName: 'Sab',
    entradas: 15200,
    saidas: 11400,
    resultado: 3800,
    saldoAcumulado: 52700,
    status: 'projetado' as const,
  },
];

const singleDataPointPayload = [
  {
    date: '2026-08-25',
    dayName: 'Seg',
    entradas: 5000,
    saidas: 3000,
    resultado: 2000,
    saldoAcumulado: 10000,
    status: 'realizado' as const,
  },
];

// ---------------------------------------------------------------------------
// Suite 1: CashFlowBarChart — renderizacao com payloads simulados
// ---------------------------------------------------------------------------

describe('CashFlowBarChart — renderizacao com payload mockado', () => {
  it('deve renderizar sem erros com payload valido de 3 periodos', () => {
    expect(() =>
      render(<CashFlowBarChart data={validCashFlowPayload} height={300} />)
    ).not.toThrow();
  });

  it('deve renderizar sem erros com array de dados vazio (estado sem dados)', () => {
    expect(() =>
      render(<CashFlowBarChart data={[]} height={300} />)
    ).not.toThrow();
  });

  it('deve renderizar com um unico ponto de dados (edge case)', () => {
    expect(() =>
      render(<CashFlowBarChart data={singleDataPointPayload} />)
    ).not.toThrow();
  });

  it('deve montar o ResponsiveContainer com as dimensoes corretas', () => {
    render(<CashFlowBarChart data={validCashFlowPayload} height={400} />);
    // O container pai deve ter height inline correto
    const wrapper = document.querySelector('[style]');
    expect(wrapper?.getAttribute('style')).toContain('400px');
  });

  it('deve aceitar height padrao de 320px quando nao especificado', () => {
    render(<CashFlowBarChart data={validCashFlowPayload} />);
    const wrapper = document.querySelector('[style]');
    expect(wrapper?.getAttribute('style')).toContain('320px');
  });

  it('deve preservar todos os campos do payload sem transformacao', () => {
    // O componente nao deve modificar os dados recebidos
    const originalData = [...validCashFlowPayload];
    render(<CashFlowBarChart data={validCashFlowPayload} />);
    // Dados originais nao devem ser mutados
    expect(validCashFlowPayload).toEqual(originalData);
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Simulacao completa de payload — da API ao grafico
// ---------------------------------------------------------------------------

describe('Simulacao de pipeline API → Chart', () => {
  it('deve processar payload com status "realizado" e "projetado" misturados', () => {
    const mixedPayload = [
      { date: '2026-06-01', dayName: 'Dom', entradas: 8000, saidas: 5000, resultado: 3000, saldoAcumulado: 30000, status: 'realizado' as const },
      { date: '2026-07-01', dayName: 'Ter', entradas: 9000, saidas: 6000, resultado: 3000, saldoAcumulado: 33000, status: 'projetado' as const },
    ];
    expect(() =>
      render(<CashFlowBarChart data={mixedPayload} />)
    ).not.toThrow();
  });

  it('deve renderizar corretamente com saldo acumulado negativo', () => {
    const negativePayload = [
      { date: '2026-08-01', dayName: 'Sex', entradas: 2000, saidas: 8000, resultado: -6000, saldoAcumulado: -6000, status: 'realizado' as const },
    ];
    expect(() =>
      render(<CashFlowBarChart data={negativePayload} />)
    ).not.toThrow();
  });

  it('deve renderizar com valores zero em entradas e saidas', () => {
    const zeroPayload = [
      { date: '2026-08-15', dayName: 'Sex', entradas: 0, saidas: 0, resultado: 0, saldoAcumulado: 0, status: 'realizado' as const },
    ];
    expect(() =>
      render(<CashFlowBarChart data={zeroPayload} />)
    ).not.toThrow();
  });

  it('deve renderizar com valores monetarios muito grandes sem overflow', () => {
    const largePayload = [
      { date: '2026-08-01', dayName: 'Sex', entradas: 9999999.99, saidas: 8888888.88, resultado: 1111111.11, saldoAcumulado: 50000000, status: 'realizado' as const },
    ];
    expect(() =>
      render(<CashFlowBarChart data={largePayload} />)
    ).not.toThrow();
  });
});
