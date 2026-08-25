export { COMPANIES, type Company } from '@/lib/constants/companies';

export type TransactionType = 'receita' | 'despesa';
export type TransactionStatus = 'pago' | 'pendente' | 'atrasado';
export type DREItemType = 'receita' | 'deducao' | 'subtotal' | 'custo' | 'despesa' | 'lucro';
export type CashFlowStatus = 'realizado' | 'projetado';
export type CashFlowCategoryType = 'entrada' | 'saida';

export interface Transaction {
  id: string;
  description: string;
  value: number;
  date: string;
  dueDate: string;
  type: TransactionType;
  status: TransactionStatus;
  category: string;
  parentCategory?: string;
  clientSupplier: string;
  documentNumber: string;
}

export interface ClientMetrics {
  saldoAtual: number;
  receberMes: number;
  pagarMes: number;
  ticketMedio: number;
  taxaInadimplencia: number;
  margemOperacional: number;
  previsao30dias: number;
}

export interface DRELineItem {
  id: string;
  code: string;
  name: string;
  value: number;
  percentage: number;
  type: DREItemType;
  isBold?: boolean;
}

export interface DREData {
  receitaBruta: number;
  impostosDeducoes: number;
  receitaLiquida: number;
  custosVendas: number;
  lucroBruto: number;
  despesasOperacionais: number;
  ebitda: number;
  lucroLiquido: number;
  margemEbitda: number;
  margemLiquida: number;
  items: DRELineItem[];
}

export interface CashFlowDailyItem {
  date: string;
  dayName: string;
  entradas: number;
  saidas: number;
  resultado: number;
  saldoAcumulado: number;
  status: CashFlowStatus;
}

export interface CashFlowCategory {
  category: string;
  value: number;
  percentage: number;
  type: CashFlowCategoryType;
  color: string;
}

export interface DetailedCashFlowData {
  saldoInicial: number;
  totalEntradas: number;
  totalSaidas: number;
  resultadoLiquido: number;
  saldoFinal: number;
  daily: CashFlowDailyItem[];
  topEntradasCategories: CashFlowCategory[];
  topSaidasCategories: CashFlowCategory[];
}

export interface AccountsPayableReceivableSummary {
  totalReceber: number;
  totalRecebido: number;
  totalPagar: number;
  totalPago: number;
  totalAtrasadoReceber: number;
  totalAtrasadoPagar: number;
  countAtrasados: number;
  accounts: Transaction[];
}

export const fetchNiboData = async (endpoint: string, params?: Record<string, string>) => {
  try {
    const url = new URL(`/api/nibo/${endpoint}`, window.location.origin);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Error fetching from Nibo proxy: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Nibo fetch error:', error);
    return null;
  }
};

const CLIENT_DATA_MOCK: Record<string, { 
  metrics: ClientMetrics; 
  cashFlow: any[]; 
  transactions: Transaction[]; 
  dre: DREData;
  dfc: DetailedCashFlowData;
  accountsSummary: AccountsPayableReceivableSummary;
}> = {
  '1': {
    metrics: {
      saldoAtual: 148520.45,
      receberMes: 42100.00,
      pagarMes: 18450.30,
      ticketMedio: 4500.00,
      taxaInadimplencia: 2.1,
      margemOperacional: 34.5,
      previsao30dias: 172170.15
    },
    cashFlow: [
      { name: 'Jan', receitas: 38000, despesas: 22000, lucro: 16000 },
      { name: 'Fev', receitas: 42000, despesas: 21000, lucro: 21000 },
      { name: 'Mar', receitas: 45000, despesas: 24000, lucro: 21000 },
      { name: 'Abr', receitas: 41000, despesas: 19500, lucro: 21500 },
      { name: 'Mai', receitas: 49000, despesas: 23000, lucro: 26000 },
      { name: 'Jun', receitas: 52000, despesas: 24500, lucro: 27500 }
    ],
    transactions: [
      { id: '101', description: 'Assinatura Plataforma Enterprise', value: 12500.00, date: '2026-08-24', dueDate: '2026-08-24', type: 'receita', status: 'pago', category: 'SaaS Subscriptions', clientSupplier: 'TechCorp Brasil', documentNumber: 'NF-8921' },
      { id: '102', description: 'Servidor AWS Cloud Services', value: 3420.50, date: '2026-08-22', dueDate: '2026-08-22', type: 'despesa', status: 'pago', category: 'Infraestrutura TI', clientSupplier: 'Amazon Web Services', documentNumber: 'INV-40912' },
      { id: '103', description: 'Consultoria de Software B2B', value: 8900.00, date: '2026-08-20', dueDate: '2026-08-28', type: 'receita', status: 'pendente', category: 'Serviços Profissionais', clientSupplier: 'Fintech Soluções', documentNumber: 'NF-8945' },
      { id: '104', description: 'Folha de Pagamento Equipe Dev', value: 15100.00, date: '2026-08-15', dueDate: '2026-08-30', type: 'despesa', status: 'pendente', category: 'Recursos Humanos', clientSupplier: 'Equipe Interna', documentNumber: 'FOL-0826' },
      { id: '105', description: 'Licenças de Ferramentas de Design', value: 450.00, date: '2026-08-15', dueDate: '2026-08-15', type: 'despesa', status: 'pago', category: 'Softwares', clientSupplier: 'Figma Inc', documentNumber: 'REC-9012' },
      { id: '106', description: 'Manutenção Servidor Dedicado', value: 1200.00, date: '2026-08-10', dueDate: '2026-08-18', type: 'despesa', status: 'atrasado', category: 'Infraestrutura TI', clientSupplier: 'Locaweb Hospedagem', documentNumber: 'FAT-3310' },
      { id: '107', description: 'Licenciamento Anual Cliente Y', value: 18500.00, date: '2026-08-01', dueDate: '2026-08-12', type: 'receita', status: 'atrasado', category: 'SaaS Subscriptions', clientSupplier: 'Grupo Varejo Soluções', documentNumber: 'NF-8801' }
    ],
    dre: {
      receitaBruta: 267000.00,
      impostosDeducoes: 16020.00,
      receitaLiquida: 250980.00,
      custosVendas: 65000.00,
      lucroBruto: 185980.00,
      despesasOperacionais: 93870.00,
      ebitda: 92110.00,
      lucroLiquido: 86598.00,
      margemEbitda: 36.7,
      margemLiquida: 32.4,
      items: []
    },
    dfc: {
      saldoInicial: 124870.75,
      totalEntradas: 52000.00,
      totalSaidas: 28350.30,
      resultadoLiquido: 23649.70,
      saldoFinal: 148520.45,
      daily: [],
      topEntradasCategories: [],
      topSaidasCategories: []
    },
    accountsSummary: {
      totalReceber: 39900.00,
      totalRecebido: 31000.00,
      totalPagar: 20170.50,
      totalPago: 3870.50,
      totalAtrasadoReceber: 18500.00,
      totalAtrasadoPagar: 1200.00,
      countAtrasados: 2,
      accounts: [
        { id: '101', description: 'Assinatura Plataforma Enterprise', value: 12500.00, date: '2026-08-24', dueDate: '2026-08-24', type: 'receita', status: 'pago', category: 'SaaS Subscriptions', clientSupplier: 'TechCorp Brasil', documentNumber: 'NF-8921' },
        { id: '102', description: 'Servidor AWS Cloud Services', value: 3420.50, date: '2026-08-22', dueDate: '2026-08-22', type: 'despesa', status: 'pago', category: 'Infraestrutura TI', clientSupplier: 'Amazon Web Services', documentNumber: 'INV-40912' },
        { id: '103', description: 'Consultoria de Software B2B', value: 8900.00, date: '2026-08-20', dueDate: '2026-08-28', type: 'receita', status: 'pendente', category: 'Serviços Profissionais', clientSupplier: 'Fintech Soluções', documentNumber: 'NF-8945' },
        { id: '104', description: 'Folha de Pagamento Equipe Dev', value: 15100.00, date: '2026-08-15', dueDate: '2026-08-30', type: 'despesa', status: 'pendente', category: 'Recursos Humanos', clientSupplier: 'Equipe Interna', documentNumber: 'FOL-0826' },
        { id: '105', description: 'Licenças de Ferramentas de Design', value: 450.00, date: '2026-08-15', dueDate: '2026-08-15', type: 'despesa', status: 'pago', category: 'Softwares', clientSupplier: 'Figma Inc', documentNumber: 'REC-9012' },
        { id: '106', description: 'Manutenção Servidor Dedicado', value: 1200.00, date: '2026-08-10', dueDate: '2026-08-18', type: 'despesa', status: 'atrasado', category: 'Infraestrutura TI', clientSupplier: 'Locaweb Hospedagem', documentNumber: 'FAT-3310' },
        { id: '107', description: 'Licenciamento Anual Cliente Y', value: 18500.00, date: '2026-08-01', dueDate: '2026-08-12', type: 'receita', status: 'atrasado', category: 'SaaS Subscriptions', clientSupplier: 'Grupo Varejo Soluções', documentNumber: 'NF-8801' }
      ]
    }
  },
  '2': {
    metrics: {
      saldoAtual: 312890.10,
      receberMes: 98500.00,
      pagarMes: 74200.00,
      ticketMedio: 12800.00,
      taxaInadimplencia: 4.8,
      margemOperacional: 19.2,
      previsao30dias: 337190.10
    },
    cashFlow: [
      { name: 'Mai', receitas: 145000, despesas: 115000, lucro: 30000 },
      { name: 'Jun', receitas: 138000, despesas: 121000, lucro: 17000 },
      { name: 'Jul', receitas: 152000, despesas: 110000, lucro: 42000 },
      { name: 'Ago', receitas: 160000, despesas: 118000, lucro: 42000 }
    ],
    transactions: [
      { id: '201', description: 'Frete Carga Pesada SP -> RJ', value: 24500.00, date: '2026-08-24', dueDate: '2026-08-24', type: 'receita', status: 'pago', category: 'Transporte Rodoviário', clientSupplier: 'Atacadão Alimentos', documentNumber: 'CTE-1049' },
      { id: '202', description: 'Combustível Frota Diesel', value: 18400.00, date: '2026-08-23', dueDate: '2026-08-23', type: 'despesa', status: 'pago', category: 'Manutenção Frota', clientSupplier: 'Postos Shell', documentNumber: 'NF-9921' },
      { id: '203', description: 'Manutenção Preventiva Caminhões', value: 6800.00, date: '2026-08-10', dueDate: '2026-08-21', type: 'despesa', status: 'atrasado', category: 'Oficina & Peças', clientSupplier: 'Mercedes-Benz peças', documentNumber: 'FAT-7712' },
      { id: '204', description: 'Logística de Distribuição Centro-Oeste', value: 31000.00, date: '2026-08-20', dueDate: '2026-08-27', type: 'receita', status: 'pendente', category: 'Logística B2B', clientSupplier: 'Magazord Comercio', documentNumber: 'CTE-1080' }
    ],
    dre: {
      receitaBruta: 890000.00,
      impostosDeducoes: 80100.00,
      receitaLiquida: 809900.00,
      custosVendas: 410000.00,
      lucroBruto: 399900.00,
      despesasOperacionais: 150000.00,
      ebitda: 249900.00,
      lucroLiquido: 210000.00,
      margemEbitda: 30.8,
      margemLiquida: 25.9,
      items: [
        { id: 'd2-1', code: '1', name: 'Receita Operacional Bruta', value: 890000, percentage: 100, type: 'receita', isBold: true },
        { id: 'd2-2', code: '1.1', name: 'Serviços de Transporte Rodoviário', value: 750000, percentage: 84.2, type: 'receita' },
        { id: 'd2-3', code: '1.2', name: 'Logística e Armazenagem', value: 140000, percentage: 15.8, type: 'receita' },
        { id: 'd2-4', code: '2', name: 'Deduções e Impostos', value: -80100, percentage: 9.0, type: 'deducao', isBold: true }
      ]
    },
    dfc: {
      saldoInicial: 280000.00,
      totalEntradas: 150000.00,
      totalSaidas: 117109.90,
      resultadoLiquido: 32890.10,
      saldoFinal: 312890.10,
      daily: [
        { date: '2026-08-22', dayName: 'Sex', entradas: 40000, saidas: 20000, resultado: 20000, saldoAcumulado: 300000, status: 'realizado' },
        { date: '2026-08-23', dayName: 'Sáb', entradas: 15000, saidas: 18400, resultado: -3400, saldoAcumulado: 296600, status: 'realizado' },
        { date: '2026-08-24', dayName: 'Dom', entradas: 24500, saidas: 0, resultado: 24500, saldoAcumulado: 321100, status: 'realizado' },
        { date: '2026-08-25', dayName: 'Seg', entradas: 0, saidas: 8209.90, resultado: -8209.90, saldoAcumulado: 312890.10, status: 'projetado' }
      ],
      topEntradasCategories: [
        { category: 'Frete B2B', value: 120000, percentage: 80, type: 'entrada', color: 'var(--success)' },
        { category: 'Armazenagem', value: 30000, percentage: 20, type: 'entrada', color: 'var(--primary)' }
      ],
      topSaidasCategories: [
        { category: 'Combustível', value: 50000, percentage: 42.6, type: 'saida', color: 'var(--danger)' },
        { category: 'Manutenção', value: 25000, percentage: 21.3, type: 'saida', color: 'var(--warning)' },
        { category: 'Folha Pagto', value: 42109.90, percentage: 36.1, type: 'saida', color: 'var(--purple)' }
      ]
    },
    accountsSummary: {
      totalReceber: 98500.00,
      totalRecebido: 55000.00,
      totalPagar: 74200.00,
      totalPago: 49000.00,
      totalAtrasadoReceber: 12500.00,
      totalAtrasadoPagar: 6800.00,
      countAtrasados: 3,
      accounts: [
        { id: '201', description: 'Frete Carga Pesada SP -> RJ', value: 24500.00, date: '2026-08-24', dueDate: '2026-08-24', type: 'receita', status: 'pago', category: 'Transporte Rodoviário', clientSupplier: 'Atacadão Alimentos', documentNumber: 'CTE-1049' },
        { id: '202', description: 'Combustível Frota Diesel', value: 18400.00, date: '2026-08-23', dueDate: '2026-08-23', type: 'despesa', status: 'pago', category: 'Manutenção Frota', clientSupplier: 'Postos Shell', documentNumber: 'NF-9921' },
        { id: '203', description: 'Manutenção Preventiva Caminhões', value: 6800.00, date: '2026-08-10', dueDate: '2026-08-21', type: 'despesa', status: 'atrasado', category: 'Oficina & Peças', clientSupplier: 'Mercedes-Benz peças', documentNumber: 'FAT-7712' },
        { id: '204', description: 'Logística de Distribuição Centro-Oeste', value: 31000.00, date: '2026-08-20', dueDate: '2026-08-27', type: 'receita', status: 'pendente', category: 'Logística B2B', clientSupplier: 'Magazord Comercio', documentNumber: 'CTE-1080' }
      ]
    }
  },
  '3': {
    metrics: {
      saldoAtual: 84120.00,
      receberMes: 31400.00,
      pagarMes: 29800.00,
      ticketMedio: 380.00,
      taxaInadimplencia: 1.2,
      margemOperacional: 14.8,
      previsao30dias: 85720.00
    },
    cashFlow: [
      { name: 'Mai', receitas: 85000, despesas: 72000, lucro: 13000 },
      { name: 'Jun', receitas: 91000, despesas: 78000, lucro: 13000 },
      { name: 'Jul', receitas: 88000, despesas: 74000, lucro: 14000 },
      { name: 'Ago', receitas: 94000, despesas: 79000, lucro: 15000 }
    ],
    transactions: [
      { id: '301', description: 'Reposição de Estoque Primavera', value: 14200.00, date: '2026-08-24', dueDate: '2026-08-24', type: 'despesa', status: 'pago', category: 'Fornecedores Estoque', clientSupplier: 'Confecções Sul', documentNumber: 'NF-4410' },
      { id: '302', description: 'Vendas Loja Física + E-commerce', value: 9800.00, date: '2026-08-23', dueDate: '2026-08-23', type: 'receita', status: 'pago', category: 'Vendas Varejo', clientSupplier: 'Clientes Diversos', documentNumber: 'SAT-9901' },
      { id: '303', description: 'Taxas Adquirentes de Cartão', value: 1250.00, date: '2026-08-22', dueDate: '2026-08-22', type: 'despesa', status: 'pago', category: 'Tarifas Bancárias', clientSupplier: 'Stone Pagamentos', documentNumber: 'EXT-8812' }
    ],
    dre: {
      receitaBruta: 358000.00,
      impostosDeducoes: 21480.00,
      receitaLiquida: 336520.00,
      custosVendas: 160000.00,
      lucroBruto: 176520.00,
      despesasOperacionais: 95000.00,
      ebitda: 81520.00,
      lucroLiquido: 68000.00,
      margemEbitda: 24.2,
      margemLiquida: 20.2,
      items: [
        { id: 'd3-1', code: '1', name: 'Receita Bruta Varejo', value: 358000, percentage: 100, type: 'receita', isBold: true },
        { id: 'd3-2', code: '2', name: 'Devoluções e Impostos', value: -21480, percentage: 6.0, type: 'deducao', isBold: true },
        { id: 'd3-3', code: '3', name: 'Receita Líquida', value: 336520, percentage: 94.0, type: 'subtotal', isBold: true },
        { id: 'd3-4', code: '4', name: 'CMV', value: -160000, percentage: 44.7, type: 'custo', isBold: true }
      ]
    },
    dfc: {
      saldoInicial: 60000.00,
      totalEntradas: 64000.00,
      totalSaidas: 39880.00,
      resultadoLiquido: 24120.00,
      saldoFinal: 84120.00,
      daily: [
        { date: '2026-08-22', dayName: 'Sex', entradas: 12000, saidas: 1250, resultado: 10750, saldoAcumulado: 70750, status: 'realizado' },
        { date: '2026-08-23', dayName: 'Sáb', entradas: 9800, saidas: 2230, resultado: 7570, saldoAcumulado: 78320, status: 'realizado' },
        { date: '2026-08-24', dayName: 'Dom', entradas: 20000, saidas: 14200, resultado: 5800, saldoAcumulado: 84120, status: 'realizado' }
      ],
      topEntradasCategories: [
        { category: 'Varejo Físico', value: 40000, percentage: 62.5, type: 'entrada', color: 'var(--success)' },
        { category: 'E-commerce', value: 24000, percentage: 37.5, type: 'entrada', color: 'var(--primary)' }
      ],
      topSaidasCategories: [
        { category: 'Fornecedores', value: 20000, percentage: 50.1, type: 'saida', color: 'var(--danger)' },
        { category: 'Marketing', value: 10000, percentage: 25.0, type: 'saida', color: 'var(--warning)' },
        { category: 'Folha', value: 9880, percentage: 24.9, type: 'saida', color: 'var(--purple)' }
      ]
    },
    accountsSummary: {
      totalReceber: 31400.00,
      totalRecebido: 21600.00,
      totalPagar: 29800.00,
      totalPago: 15400.00,
      totalAtrasadoReceber: 0,
      totalAtrasadoPagar: 0,
      countAtrasados: 0,
      accounts: [
        { id: '301', description: 'Reposição de Estoque Primavera', value: 14200.00, date: '2026-08-24', dueDate: '2026-08-24', type: 'despesa', status: 'pago', category: 'Fornecedores Estoque', clientSupplier: 'Confecções Sul', documentNumber: 'NF-4410' },
        { id: '302', description: 'Vendas Loja Física + E-commerce', value: 9800.00, date: '2026-08-23', dueDate: '2026-08-23', type: 'receita', status: 'pago', category: 'Vendas Varejo', clientSupplier: 'Clientes Diversos', documentNumber: 'SAT-9901' },
        { id: '303', description: 'Taxas Adquirentes de Cartão', value: 1250.00, date: '2026-08-22', dueDate: '2026-08-22', type: 'despesa', status: 'pago', category: 'Tarifas Bancárias', clientSupplier: 'Stone Pagamentos', documentNumber: 'EXT-8812' }
      ]
    }
  }
};

// ============================================================================
// LÓGICA DE INTEGRAÇÃO REAL COM A API NIBO
// Mapeamos os endpoints /schedules/debit e /schedules/credit para o nosso formato.
// ============================================================================

export const getClientData = async (companyId: string) => {
  if (companyId !== '1') {
    // Para Nexus e Inovare mantemos o Mock para demonstração UI
    return CLIENT_DATA_MOCK[companyId] || CLIENT_DATA_MOCK['1'];
  }

  try {
    // 1. Buscar Receitas Reais (Credit)
    const creditsRes = await fetchNiboData('schedules/credit');
    // 2. Buscar Despesas Reais (Debit)
    const debitsRes = await fetchNiboData('schedules/debit');

    const rawCredits = creditsRes?.items || [];
    const rawDebits = debitsRes?.items || [];

    // Mapear para o formato de Transação do Dashboard
    const mappedTransactions: Transaction[] = [];

    const now = Date.now();

    rawCredits.forEach((item: any) => {
      const cat = item.categories && item.categories.length > 0 ? item.categories[0] : null;
      let status: TransactionStatus = 'pendente';
      if (item.isPaid) {
        status = 'pago';
      } else if (item.dueDate && new Date(item.dueDate).getTime() < now) {
        status = 'atrasado';
      }

      mappedTransactions.push({
        id: item.scheduleId,
        description: item.description || 'Recebimento',
        value: item.value || 0,
        date: item.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        dueDate: item.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        type: 'receita',
        status,
        category: cat?.categoryName || item.category?.name || 'Vendas/Serviços',
        parentCategory: cat?.parent || 'Receitas operacionais',
        clientSupplier: item.stakeholder?.name || 'Cliente Diverso',
        documentNumber: item.reference || ''
      });
    });

    rawDebits.forEach((item: any) => {
      const cat = item.categories && item.categories.length > 0 ? item.categories[0] : null;
      let status: TransactionStatus = 'pendente';
      if (item.isPaid) {
        status = 'pago';
      } else if (item.dueDate && new Date(item.dueDate).getTime() < now) {
        status = 'atrasado';
      }

      mappedTransactions.push({
        id: item.scheduleId,
        description: item.description || 'Pagamento',
        value: item.value || 0,
        date: item.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        dueDate: item.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        type: 'despesa',
        status,
        category: cat?.categoryName || item.category?.name || 'Despesas Gerais',
        parentCategory: cat?.parent || 'Despesas operacionais',
        clientSupplier: item.stakeholder?.name || 'Fornecedor',
        documentNumber: item.reference || ''
      });
    });

    // Ordenar por data (mais recente primeiro)
    mappedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 3. Calcular Métricas Reais Baseadas nas Transações
    const receitasPagas = mappedTransactions.filter(t => t.type === 'receita' && t.status === 'pago').reduce((acc, t) => acc + t.value, 0);
    const despesasPagas = mappedTransactions.filter(t => t.type === 'despesa' && t.status === 'pago').reduce((acc, t) => acc + t.value, 0);
    
    const receberMes = mappedTransactions.filter(t => t.type === 'receita' && t.status === 'pendente').reduce((acc, t) => acc + t.value, 0);
    const pagarMes = mappedTransactions.filter(t => t.type === 'despesa' && t.status === 'pendente').reduce((acc, t) => acc + t.value, 0);

    const saldoAtual = receitasPagas - despesasPagas;
    const hasReceitas = mappedTransactions.some(t => t.type === 'receita');

    const metrics: ClientMetrics = {
      saldoAtual: saldoAtual, // Saldo inferido pelo fluxo de pagamentos liquidado
      receberMes: receberMes,
      pagarMes: pagarMes,
      ticketMedio: hasReceitas 
        ? Math.round((receitasPagas + receberMes) / mappedTransactions.filter(t => t.type === 'receita').length)
        : 0,
      taxaInadimplencia: 0, // Poderia ser calculado via status 'atrasado'
      margemOperacional: receitasPagas > 0 ? Math.round(((receitasPagas - despesasPagas) / receitasPagas) * 100) : 0,
      previsao30dias: saldoAtual + (receberMes - pagarMes)
    };

    // 4. Agrupar Fluxo de Caixa Mensalmente (Realizado)
    const cashFlowMap: Record<string, { receitas: number; despesas: number; lucro: number }> = {};
    
    mappedTransactions.forEach(t => {
      if (t.status !== 'pago') return;
      const dateObj = new Date(t.date);
      const monthKey = dateObj.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }); // ex: "ago. de 2026"
      
      if (!cashFlowMap[monthKey]) {
        cashFlowMap[monthKey] = { receitas: 0, despesas: 0, lucro: 0 };
      }
      if (t.type === 'receita') cashFlowMap[monthKey].receitas += t.value;
      if (t.type === 'despesa') cashFlowMap[monthKey].despesas += t.value;
    });

    const cashFlow = Object.keys(cashFlowMap).map(key => ({
      name: key.replace('.', '').substring(0, 3).toUpperCase(),
      receitas: cashFlowMap[key].receitas,
      despesas: cashFlowMap[key].despesas,
      lucro: cashFlowMap[key].receitas - cashFlowMap[key].despesas
    })).reverse(); // Reverter para cronológico se a leitura for reversa

    return {
      metrics,
      cashFlow: cashFlow.length > 0 ? cashFlow : CLIENT_DATA_MOCK['1'].cashFlow,
      transactions: mappedTransactions.length > 0 ? mappedTransactions : CLIENT_DATA_MOCK['1'].transactions,
    };
  } catch (error) {
    console.error('Falha ao processar dados da API Real Nibo. Caindo para Mock.', error);
    return CLIENT_DATA_MOCK['1'];
  }
};

export const getDREData = async (companyId: string, period: string = '2026-ytd'): Promise<DREData> => {
  const clientData = await getClientData(companyId);
  const txs = clientData.transactions;

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Filtrar apenas pagos e aplicar o filtro de período
  const paidTxs = txs.filter(t => {
    if (t.status !== 'pago') return false;
    
    const d = new Date(t.date);
    if (period === '2026-m') {
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    } else if (period === '2026-q') {
      // Últimos 3 meses (trimestre atual/recente)
      const diffMonths = (currentYear - d.getFullYear()) * 12 + (currentMonth - d.getMonth());
      return diffMonths >= 0 && diffMonths < 3;
    } else {
      // YTD ou todos
      return d.getFullYear() === currentYear;
    }
  });

  let receitaBruta = 0;
  let deducoes = 0;
  let custos = 0;
  let despesasOperacionais = 0;
  
  const parentMap: Record<string, { value: number, type: DRELineItem['type'] }> = {};

  paidTxs.forEach(t => {
    const parent = t.parentCategory?.trim() || (t.type === 'receita' ? 'Outras Receitas' : 'Despesas Gerais');
    const nameUpper = parent.toUpperCase();
    
    if (!parentMap[parent]) {
      parentMap[parent] = { value: 0, type: t.type === 'receita' ? 'receita' : 'despesa' };
    }
    
    if (t.type === 'receita') {
      parentMap[parent].value += t.value;
      receitaBruta += t.value;
    } else {
      parentMap[parent].value += t.value;
      
      // Tentar classificar deduções e custos pelo nome da categoria pai do Nibo
      if (nameUpper.includes('IMPOSTO') || nameUpper.includes('DEDU')) {
        deducoes += t.value;
        parentMap[parent].type = 'deducao';
      } else if (nameUpper.includes('CUSTO') || nameUpper.includes('FORNECEDOR') || nameUpper.includes('CMV')) {
        custos += t.value;
        parentMap[parent].type = 'custo';
      } else {
        despesasOperacionais += t.value;
      }
    }
  });

  const receitaLiquida = receitaBruta - deducoes;
  const lucroBruto = receitaLiquida - custos;
  const lucroLiquido = lucroBruto - despesasOperacionais;
  const ebitda = lucroLiquido; // Sem dados de depreciação/amortização explícitos, ebitda = lucro líquido

  const items: DRELineItem[] = Object.keys(parentMap).map((key, index) => {
    const item = parentMap[key];
    return {
      id: `dre-${index}`,
      code: `1.${index + 1}`,
      name: key,
      value: item.type === 'receita' ? item.value : -item.value,
      percentage: receitaBruta > 0 ? (item.value / receitaBruta) * 100 : 0,
      type: item.type,
      isBold: false
    };
  });

  // Ordenar itens: receitas primeiro, depois deducoes, custos, despesas
  const order = { 'receita': 1, 'deducao': 2, 'custo': 3, 'despesa': 4, 'subtotal': 5, 'lucro': 6 };
  items.sort((a, b) => (order[a.type] || 99) - (order[b.type] || 99));

  return {
    receitaBruta,
    impostosDeducoes: deducoes,
    receitaLiquida,
    custosVendas: custos,
    lucroBruto,
    despesasOperacionais,
    ebitda,
    lucroLiquido,
    margemEbitda: receitaBruta > 0 ? (ebitda / receitaBruta) * 100 : 0,
    margemLiquida: receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0,
    items
  };
};

export const getCashFlowData = async (companyId: string): Promise<DetailedCashFlowData> => {
  const clientData = await getClientData(companyId);
  const txs = clientData.transactions;

  // Gerar fluxo de caixa diário baseado nas transações pagas (Realizado)
  const dailyFlowMap: Record<string, { in: number; out: number }> = {};
  
  txs.forEach(t => {
    if (t.status !== 'pago') return;
    const dateObj = new Date(t.date);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const dayKey = `${year}-${month}-${day}`;
    
    if (!dailyFlowMap[dayKey]) dailyFlowMap[dayKey] = { in: 0, out: 0 };
    if (t.type === 'receita') dailyFlowMap[dayKey].in += t.value;
    if (t.type === 'despesa') dailyFlowMap[dayKey].out += t.value;
  });

  // Calcular saldos primeiro
  const totalEntradas = txs.filter(t => t.type === 'receita' && t.status === 'pago').reduce((acc, t) => acc + t.value, 0);
  const totalSaidas = txs.filter(t => t.type === 'despesa' && t.status === 'pago').reduce((acc, t) => acc + t.value, 0);
  const resultadoLiquido = totalEntradas - totalSaidas;
  const saldoFinal = clientData.metrics.saldoAtual;
  const saldoInicial = saldoFinal - resultadoLiquido;

  let saldoAcumuladoLoop = saldoInicial;

  const dailyFlow = Object.keys(dailyFlowMap)
    .sort((a, b) => a.localeCompare(b))
    .map(key => {
      const entradas = dailyFlowMap[key].in;
      const saidas = dailyFlowMap[key].out;
      const resultado = entradas - saidas;
      saldoAcumuladoLoop += resultado;
      
      return {
        date: key,
        dayName: '', // Poderia ser extraído da data real
        entradas,
        saidas,
        resultado,
        saldoAcumulado: saldoAcumuladoLoop,
        status: 'realizado' as const
      };
    });

  const colorsIn = ['var(--success)', 'var(--primary)', 'var(--warning)', 'var(--purple)'];
  const colorsOut = ['var(--danger)', 'var(--warning)', 'var(--purple)', 'var(--secondary)'];

  // Agregar top categorias de entradas
  const inCategoryMap: Record<string, number> = {};
  txs.filter(t => t.type === 'receita' && t.status === 'pago').forEach(t => {
    inCategoryMap[t.category] = (inCategoryMap[t.category] || 0) + t.value;
  });
  
  const topEntradasCategories = Object.entries(inCategoryMap)
    .map(([name, value], index) => ({ 
      category: name, 
      value, 
      percentage: totalEntradas > 0 ? (value / totalEntradas) * 100 : 0,
      type: 'entrada' as const,
      color: colorsIn[index % colorsIn.length]
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  // Agregar top categorias de saídas
  const outCategoryMap: Record<string, number> = {};
  txs.filter(t => t.type === 'despesa' && t.status === 'pago').forEach(t => {
    outCategoryMap[t.category] = (outCategoryMap[t.category] || 0) + t.value;
  });
  
  const topSaidasCategories = Object.entries(outCategoryMap)
    .map(([name, value], index) => ({ 
      category: name, 
      value,
      percentage: totalSaidas > 0 ? (value / totalSaidas) * 100 : 0,
      type: 'saida' as const,
      color: colorsOut[index % colorsOut.length]
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  return {
    saldoInicial,
    totalEntradas,
    totalSaidas,
    resultadoLiquido,
    saldoFinal,
    daily: dailyFlow,
    topEntradasCategories,
    topSaidasCategories
  };
};

export const getAccountsSummary = async (companyId: string): Promise<AccountsPayableReceivableSummary> => {
  const clientData = await getClientData(companyId);
  const txs = clientData.transactions;

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Filtrar transações apenas do mês atual para os totais de (MÊS)
  const currentMonthTxs = txs.filter(t => {
    const d = new Date(t.dueDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalReceber = currentMonthTxs.filter(t => t.type === 'receita').reduce((a, b) => a + b.value, 0);
  const totalRecebido = currentMonthTxs.filter(t => t.type === 'receita' && t.status === 'pago').reduce((a, b) => a + b.value, 0);
  const totalPagar = currentMonthTxs.filter(t => t.type === 'despesa').reduce((a, b) => a + b.value, 0);
  const totalPago = currentMonthTxs.filter(t => t.type === 'despesa' && t.status === 'pago').reduce((a, b) => a + b.value, 0);
  
  // Títulos em atraso independem do mês
  const contasAtrasadasReceber = txs.filter(t => t.type === 'receita' && t.status === 'atrasado');
  const contasAtrasadasPagar = txs.filter(t => t.type === 'despesa' && t.status === 'atrasado');

  const totalAtrasadoReceber = contasAtrasadasReceber.reduce((a, b) => a + b.value, 0);
  const totalAtrasadoPagar = contasAtrasadasPagar.reduce((a, b) => a + b.value, 0);

  return {
    totalReceber,
    totalRecebido,
    totalPagar,
    totalPago,
    totalAtrasadoReceber,
    totalAtrasadoPagar,
    countAtrasados: contasAtrasadasReceber.length + contasAtrasadasPagar.length,
    accounts: txs
  };
};

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  openBalance: number;
  type: string;
  bankAgency?: string;
  bankAccount?: string;
  isVirtual: boolean;
  isAutomated: boolean;
}

export interface Stakeholder {
  id: string;
  name: string;
  type: 'Customer' | 'Supplier';
  documentNumber: string;
  documentType: string;
  isCompany: boolean;
  totalValue?: number;
  countTransactions?: number;
}

export interface CostCenter {
  costCenterId: string;
  description: string;
}

export const getBankAccounts = async (companyId: string): Promise<BankAccount[]> => {
  if (companyId !== '1') {
    return [
      { id: 'b1', name: 'Itaú Unibanco', bankName: 'Itaú', openBalance: 125400.50, type: 'BankAccount', isVirtual: false, isAutomated: true },
      { id: 'b2', name: 'Bradesco Prime', bankName: 'Bradesco', openBalance: 23119.95, type: 'BankAccount', isVirtual: false, isAutomated: true }
    ];
  }

  try {
    const res = await fetchNiboData('accounts');
    const items = res?.items || [];
    return items.map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      bankName: acc.bankName || 'Conta Corrente',
      openBalance: acc.openBalance || 0,
      type: acc.type || 'BankAccount',
      bankAgency: acc.bankAgency || '',
      bankAccount: acc.bankAccount || '',
      isVirtual: !!acc.isVirtual,
      isAutomated: !!acc.isAutomated
    }));
  } catch (error) {
    console.error('Erro ao buscar contas bancárias Nibo:', error);
    return [];
  }
};

export const getCostCenters = async (companyId: string): Promise<CostCenter[]> => {
  if (companyId !== '1') {
    return [
      { costCenterId: 'cc1', description: 'Matriz São Paulo' },
      { costCenterId: 'cc2', description: 'Filial Rio de Janeiro' }
    ];
  }

  try {
    const res = await fetchNiboData('costcenters');
    const items = res?.items || [];
    return items.map((cc: any) => ({
      costCenterId: cc.costCenterId,
      description: cc.description
    }));
  } catch (error) {
    console.error('Erro ao buscar centros de custo Nibo:', error);
    return [];
  }
};

export const getStakeholders = async (companyId: string): Promise<Stakeholder[]> => {
  if (companyId !== '1') {
    return [
      { id: 's1', name: 'Atacadão Alimentos LTDA', type: 'Customer', documentNumber: '11.222.333/0001-44', documentType: 'Cnpj', isCompany: true, totalValue: 180000, countTransactions: 12 },
      { id: 's2', name: 'Postos Shell Combustíveis', type: 'Supplier', documentNumber: '22.333.444/0001-55', documentType: 'Cnpj', isCompany: true, totalValue: 95000, countTransactions: 24 }
    ];
  }

  try {
    const res = await fetchNiboData('stakeholders');
    const clientData = await getClientData(companyId);
    const txs = clientData.transactions;

    const items = res?.items || [];
    return items.map((stk: any) => {
      const matchTxs = txs.filter(t => t.clientSupplier?.toLowerCase() === stk.name?.toLowerCase());
      const totalValue = matchTxs.reduce((acc, t) => acc + t.value, 0);

      return {
        id: stk.id,
        name: stk.name || 'Sem Nome',
        type: stk.type === 'Customer' ? 'Customer' : 'Supplier',
        documentNumber: stk.document?.number || 'Não informado',
        documentType: stk.document?.type || (stk.isCompany ? 'Cnpj' : 'Cpf'),
        isCompany: !!stk.isCompany,
        totalValue,
        countTransactions: matchTxs.length
      };
    });
  } catch (error) {
    console.error('Erro ao buscar clientes e fornecedores Nibo:', error);
    return [];
  }
};
