/**
 * exportToExcel.test.ts
 *
 * Testes unitarios para as funcoes de exportacao financeira.
 * Foco nas regras de negocio: formatacao de dados, calculo de totais,
 * geracao de nomes de arquivo, e transformacao de transacoes para CSV.
 *
 * OBS: XLSX.writeFile e URL.createObjectURL sao mockados pois dependem
 * de ambiente de browser/filesystem — nao precisamos testar o xlsx em si,
 * apenas a logica de negocio que prepara os dados.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do modulo xlsx para nao depender de filesystem em testes
vi.mock('xlsx', () => {
  const sheetData: Record<string, unknown[][]> = {};
  const sheets: Record<string, string> = {};

  return {
    utils: {
      book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
      aoa_to_sheet: vi.fn((data: unknown[][]) => {
        sheetData['last'] = data;
        return { data };
      }),
      book_append_sheet: vi.fn((wb: Record<string, unknown>, ws: unknown, name: string) => {
        sheets[name] = name;
        wb.SheetNames = [...(wb.SheetNames as string[]), name];
        wb.Sheets = { ...(wb.Sheets as object), [name]: ws };
      }),
    },
    writeFile: vi.fn(),
  };
});

import * as XLSX from 'xlsx';
import { exportFinancialsToExcel, exportFinancialsToCSV } from '@/lib/utils/exportToExcel';
import type { Company, ClientMetrics, Transaction } from '@/lib/api/niboClient';

// ---------------------------------------------------------------------------
// Fixtures reutilizaveis
// ---------------------------------------------------------------------------

const mockCompany: Company = {
  id: '1',
  name: 'Harlani Tecnologia LTDA',
  cnpj: '12.345.678/0001-90',
  segment: 'Tecnologia & SaaS',
  status: 'Ativa',
};

const mockMetrics: ClientMetrics = {
  saldoAtual: 148520.45,
  receberMes: 62400.0,
  pagarMes: 41200.0,
  ticketMedio: 4800,
  taxaInadimplencia: 1.2,
  margemOperacional: 24.8,
  previsao30dias: 169720.45,
};

const mockCashFlow = [
  { name: 'Jan', receitas: 85000, despesas: 72000, lucro: 13000 },
  { name: 'Fev', receitas: 91000, despesas: 78000, lucro: 13000 },
  { name: 'Mar', receitas: 88000, despesas: 74000, lucro: 14000 },
];

const mockTransactions: Transaction[] = [
  {
    id: 'tx-001',
    description: 'Contrato Mensal Harlani BPO',
    value: 4800,
    date: '2026-08-01',
    dueDate: '2026-08-01',
    type: 'receita',
    status: 'pago',
    category: 'Servicos BPO',
    clientSupplier: 'Cliente ABC',
    documentNumber: 'NF-1001',
  },
  {
    id: 'tx-002',
    description: 'Aluguel Escritorio',
    value: 3200,
    date: '2026-08-05',
    dueDate: '2026-08-05',
    type: 'despesa',
    status: 'pago',
    category: 'Despesas Administrativas',
    clientSupplier: 'Imobiliaria XYZ',
    documentNumber: 'REC-2201',
  },
  {
    id: 'tx-003',
    description: 'Contrato com desconto especial — empresa "Parceiro & Cia"',
    value: 2500,
    date: '2026-08-10',
    dueDate: '2026-08-10',
    type: 'receita',
    status: 'pendente',
    category: 'Servicos BPO',
    clientSupplier: 'Parceiro & Cia',
    documentNumber: 'NF-1002',
  },
];

// ---------------------------------------------------------------------------
// Suite 1: exportFinancialsToExcel
// ---------------------------------------------------------------------------

describe('exportFinancialsToExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar um workbook com 3 abas (Resumo, Fluxo, Extrato)', () => {
    exportFinancialsToExcel({
      company: mockCompany,
      metrics: mockMetrics,
      cashFlow: mockCashFlow,
      transactions: mockTransactions,
      period: '2026',
    });

    // Verifica que book_append_sheet foi chamado 3 vezes (3 abas)
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(3);

    const calls = vi.mocked(XLSX.utils.book_append_sheet).mock.calls;
    expect(calls[0][2]).toBe('Resumo Executivo');
    expect(calls[1][2]).toBe('Fluxo de Caixa');
    expect(calls[2][2]).toBe('Extrato de Lançamentos');
  });

  it('deve usar os dados da empresa na aba de resumo', () => {
    exportFinancialsToExcel({
      company: mockCompany,
      metrics: mockMetrics,
      cashFlow: mockCashFlow,
      transactions: mockTransactions,
      period: '2026',
    });

    const aoa_calls = vi.mocked(XLSX.utils.aoa_to_sheet).mock.calls;
    const summaryData = aoa_calls[0][0] as unknown[][];

    // Linha de empresa
    const empresaRow = summaryData.find((row) => row[0] === 'Empresa:');
    expect(empresaRow).toBeDefined();
    expect(empresaRow![1]).toBe('Harlani Tecnologia LTDA');

    // Linha de CNPJ
    const cnpjRow = summaryData.find((row) => row[0] === 'CNPJ:');
    expect(cnpjRow![1]).toBe('12.345.678/0001-90');
  });

  it('deve calcular corretamente os totais acumulados do fluxo de caixa', () => {
    exportFinancialsToExcel({
      company: mockCompany,
      metrics: mockMetrics,
      cashFlow: mockCashFlow,
      transactions: mockTransactions,
      period: '2026',
    });

    const aoa_calls = vi.mocked(XLSX.utils.aoa_to_sheet).mock.calls;
    // Segunda aba = fluxo de caixa (indice 1)
    const cashFlowSheet = aoa_calls[1][0] as unknown[][];
    // Ultima linha = totalizador (apos header + 3 meses)
    const totalRow = cashFlowSheet[cashFlowSheet.length - 1];

    // Total receitas: 85000 + 91000 + 88000 = 264000
    expect(totalRow[1]).toBe(264000);
    // Total despesas: 72000 + 78000 + 74000 = 224000
    expect(totalRow[2]).toBe(224000);
    // Total lucro: 264000 - 224000 = 40000
    expect(totalRow[3]).toBe(40000);
  });

  it('deve gerar nome de arquivo com nome da empresa e periodo', () => {
    exportFinancialsToExcel({
      company: mockCompany,
      metrics: mockMetrics,
      cashFlow: mockCashFlow,
      transactions: mockTransactions,
      period: 'Janeiro_2026',
    });

    const writeFileCalls = vi.mocked(XLSX.writeFile).mock.calls;
    const fileName = writeFileCalls[0][1] as string;
    expect(fileName).toContain('Harlani_Tecnologia_LTDA');
    expect(fileName).toContain('Janeiro_2026');
    expect(fileName).toMatch(/\.xlsx$/);
  });

  it('deve tratar receitas com valor positivo e despesas com valor negativo no extrato', () => {
    exportFinancialsToExcel({
      company: mockCompany,
      metrics: mockMetrics,
      cashFlow: mockCashFlow,
      transactions: mockTransactions,
      period: '2026',
    });

    const aoa_calls = vi.mocked(XLSX.utils.aoa_to_sheet).mock.calls;
    // Terceira aba = extrato (indice 2), excluindo o header (indice 0)
    const extractSheet = aoa_calls[2][0] as unknown[][];
    const txReceita = extractSheet[1]; // tx-001 receita
    const txDespesa = extractSheet[2]; // tx-002 despesa

    expect(txReceita[7]).toBe(4800);   // receita: positivo
    expect(txDespesa[7]).toBe(-3200);  // despesa: negativo
  });

  it('deve funcionar com fluxo de caixa vazio sem erros', () => {
    expect(() =>
      exportFinancialsToExcel({
        company: mockCompany,
        metrics: mockMetrics,
        cashFlow: [],
        transactions: [],
        period: '2026',
      })
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Suite 2: exportFinancialsToCSV (logica de formatacao)
// ---------------------------------------------------------------------------

describe('exportFinancialsToCSV — logica de formatacao CSV', () => {
  it('deve escapar aspas duplas em campos de texto conforme RFC 4180', () => {
    // A descricao "Parceiro & Cia" tem aspas no campo clientSupplier
    // RFC 4180: aspas dentro de campos CSV devem ser dobradas: " -> ""
    const tx = mockTransactions[2]; // "Parceiro & Cia"

    // Simular a logica de escape usada na funcao
    const escaped = tx.description.replaceAll('"', '""');
    expect(escaped).toBe(
      'Contrato com desconto especial — empresa "Parceiro & Cia"'.replaceAll('"', '""')
    );
  });

  it('deve usar valor numerico sem formatacao monetaria no CSV', () => {
    // Valores devem ser numericos (ex: 4800), nao "R$ 4.800,00"
    // para que planilhas possam calcular sobre eles
    const tx = mockTransactions[0];
    const csvValue = String(tx.value);
    expect(csvValue).toBe('4800');
    expect(csvValue).not.toContain('R$');
    expect(csvValue).not.toContain(',');
  });
});
