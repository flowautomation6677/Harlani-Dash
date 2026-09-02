export { COMPANIES, type Company } from '@/lib/constants/companies';
import { validateAndFilterItems, validateItem } from '@/lib/api/niboValidation';
import {
  NiboCreditScheduleSchema,
  NiboDebitScheduleSchema,
  NiboBankAccountSchema,
  type NiboCreditSchedule,
  type NiboDebitSchedule,
} from '@/lib/api/niboSchemas';

// `new Date('YYYY-MM-DD')` parses the string as UTC midnight; reading it back with
// local getters (getDate/getMonth/getFullYear) then shifts it a day backward in any
// timezone behind UTC (e.g. Brazil), which misattributes day-1-of-month transactions
// to the last day of the previous month. Parsing the Y/M/D components directly into
// a local Date avoids that round-trip entirely.
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export type TransactionType = 'receita' | 'despesa';
export type TransactionStatus = 'pago' | 'pendente' | 'atrasado';
export type DREItemType = 'receita' | 'deducao' | 'subtotal' | 'custo' | 'despesa' | 'lucro';
export type CashFlowStatus = 'realizado' | 'projetado';
export type CashFlowCategoryType = 'entrada' | 'saida';
export type AccountingTag = 
  | 'OPERACIONAL' 
  | 'CUSTO_MERCADORIA_SERVICO'
  | 'JUROS_FINANCEIRO' 
  | 'RENDIMENTO_FINANCEIRO'
  | 'IMPOSTOS'
  | 'IMPOSTOS_DEDUCAO' 
  | 'IMPOSTOS_LUCRO' 
  | 'DEPRECIACAO_AMORTIZACAO' 
  | 'INVESTIMENTO_NAO_OPERACIONAL'
  | 'TRANSFERENCIA_INTERNA';

export interface Transaction {
  id: string;
  description: string;
  value: number;
  paidValue?: number;
  interestValue?: number;
  fineValue?: number;
  discountValue?: number;
  date: string;
  dueDate: string;
  settlementDate?: string;
  type: TransactionType;
  status: TransactionStatus;
  category: string;
  parentCategory?: string;
  clientSupplier: string;
  documentNumber: string;
  tag?: AccountingTag;
  source?: 'schedule' | 'statement';
}

export function classifyTransactionTag(
  category: string, 
  parentCategory?: string, 
  description?: string,
  type?: TransactionType
): AccountingTag {
  const text = `${category} ${parentCategory || ''} ${description || ''}`.toUpperCase();

  // 1. Transferências internas entre contas
  // Nota: NÃO usar apenas "TRANSF" como substring — "SISPAG TRANSF CC ITAU" e
  // "PIX TRANSF <nome>" são apenas o rótulo do meio de pagamento (transferência
  // bancária) que o Itaú/Nibo usa para qualquer pagamento/recebimento real
  // (aluguel, pró-labore, mensalidades etc.), não uma transferência entre contas
  // próprias. Exigir o termo completo evita excluir receita/despesa real.
  if (
    text.includes('TRANSFERENCIA') ||
    text.includes('TRANSFERÊNCIA') ||
    text.includes('APLICACAO RESGATE') ||
    text.includes('ENTRE CONTAS') ||
    text.includes('TRANSF.')
  ) {
    return 'TRANSFERENCIA_INTERNA';
  }

  // 2. Depreciação e Amortização (expurgados do EBITDA)
  if (
    text.includes('DEPRECIA') || 
    text.includes('AMORTIZA') || 
    text.includes('EXAUSTAO')
  ) {
    return 'DEPRECIACAO_AMORTIZACAO';
  }

  // 3. Impostos sobre o Lucro vs Impostos sobre Faturamento (Dedução de Receita)
  if (
    text.includes('IRPJ') || 
    text.includes('CSLL') || 
    text.includes('IMPOSTO DE RENDA PJ') || 
    text.includes('CONTRIBUIÇÃO SOCIAL SOBRE O LUCRO')
  ) {
    return 'IMPOSTOS_LUCRO';
  }

  if (
    text.includes('IMPOSTO') || 
    text.includes('SIMPLES NACIONAL') || 
    text.includes('DAS ') || 
    text.includes('ISS') || 
    text.includes('ICMS') || 
    text.includes('PIS') || 
    text.includes('COFINS') || 
    text.includes('TRIBUT') || 
    text.includes('DEDU') || 
    text.includes('RETEN') ||
    text.includes('IRRF') ||
    text.includes('INSS') ||
    text.includes('CPRB')
  ) {
    return 'IMPOSTOS_DEDUCAO';
  }

  // 4. Receitas / Rendimentos Financeiros (adicionados APÓS o EBITDA)
  if (type === 'receita' && (
    text.includes('RENDIMENTO') || 
    text.includes('APLICACAO') || 
    text.includes('APLICAÇÃO') || 
    text.includes('JUROS RECEBIDOS') || 
    text.includes('JUROS ATIVOS') || 
    text.includes('DIVIDENDO') || 
    text.includes('DESCONTO OBTIDO') || 
    text.includes('CDI') || 
    text.includes('SELIC') ||
    text.includes('LUCRO DE APLICACAO')
  )) {
    return 'RENDIMENTO_FINANCEIRO';
  }

  // 5. Despesas Financeiras, Juros, Tarifas, Encargos, IOF (expurgados do EBITDA)
  if (
    text.includes('JURO') || 
    text.includes('MULTA') || 
    text.includes('TARIFA') || 
    text.includes('TAXA') || 
    text.includes('IOF') || 
    text.includes('BANCAR') || 
    text.includes('BANCÁR') ||
    text.includes('ENCARGO') || 
    text.includes('ANTECIPA') || 
    text.includes('DESAGIO') || 
    text.includes('DESÁGIO') ||
    text.includes('DESCONTO CONCEDIDO') || 
    text.includes('CARTAO TAXA') || 
    text.includes('MAQUININHA') ||
    text.includes('MANUTENCAO CONTA') ||
    text.includes('MANUTENÇÃO CONTA') ||
    text.includes('TED') || 
    text.includes('DOC') ||
    text.includes('PIX TAXA') ||
    text.includes('ANUIDADE') ||
    text.includes('CUSTODIA') ||
    text.includes('MORA')
  ) {
    return 'JUROS_FINANCEIRO';
  }

  // 6. Custos Diretos de Vendas / Mercadorias / Serviços (CMV / CSP)
  if (
    text.includes('CUSTO') || 
    text.includes('CMV') || 
    text.includes('CSP') || 
    text.includes('FORNECEDOR DE MERCADORIA') || 
    text.includes('MATERIA PRIMA') || 
    text.includes('MATÉRIA-PRIMA') ||
    text.includes('INSUMO') ||
    text.includes('EMBALAGEM') ||
    text.includes('FRETE SOBRE COMPRA') ||
    text.includes('TERCEIRIZACAO DIRETA')
  ) {
    return 'CUSTO_MERCADORIA_SERVICO';
  }

  // 7. Investimentos / Empréstimos / Aportes / Não-operacionais
  if (
    text.includes('INVESTIMENTO') || 
    text.includes('CAPITAL') || 
    text.includes('EMPRESTIMO') || 
    text.includes('EMPRÉSTIMO') || 
    text.includes('APORTE') || 
    (text.includes('PRO-LABORE') && text.includes('DISTRIBUICAO')) || 
    text.includes('MUTUO') ||
    text.includes('MÚTUO')
  ) {
    return 'INVESTIMENTO_NAO_OPERACIONAL';
  }

  return 'OPERACIONAL';
}

export interface EbitdaMonthlyItem {
  month: string;
  receitaLiquida: number;
  custosOperacionais: number;
  ebitda: number;
  margemEbitda: number;
  lucroLiquido: number;
}

export interface BreakEvenAnalysis {
  fixedExpenses: number;
  variableExpenses: number;
  totalRevenue: number;
  contributionMarginValue: number;
  contributionMarginPercent: number;
  breakEvenPoint: number;
  safetyMarginValue: number;
  safetyMarginPercent: number;
  monthlyBreakdown: {
    month: string;
    faturamento: number;
    custosFixos: number;
    custosTotais: number;
    pontoEquilibrio: number;
  }[];
}

export interface FinancialHealthAnalysis {
  ebitda: number;
  margemEbitda: number;
  jurosFinanceiro: number;
  impostos: number;
  depreciacaoAmortizacao: number;
  lucroLiquido: number;
  breakEven: BreakEvenAnalysis;
  ebitdaEvolution: EbitdaMonthlyItem[];
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

export const fetchNiboData = async (endpoint: string, params?: Record<string, string>, companyId = '1') => {
  try {
    const url = new URL(`/api/nibo/${endpoint}`, window.location.origin);
    url.searchParams.set('companyId', companyId);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    
    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) {
      // Retorna null silenciosamente caso o endpoint retorne 404 ou 500
      return null;
    }
    
    return await response.json();
  } catch {
    return null;
  }
};

export const fetchNiboDataPaginated = async (
  endpoint: string,
  baseParams: Record<string, string> = {},
  pageSize: number = 500,
  maxPages: number = 20,
  companyId = '1'
) => {
  let allItems: any[] = [];
  let skip = 0;
  let hasMore = true;
  let page = 0;

  while (hasMore && page < maxPages) {
    const params: Record<string, string> = {
      ...baseParams,
      '$top': String(pageSize),
      '$skip': String(skip)
    };

    const res = await fetchNiboData(endpoint, params, companyId);
    if (!res) {
      throw new Error(`Falha ao buscar dados reais do Nibo em "${endpoint}". Verifique o token/URL configurados.`);
    }

    const items = Array.isArray(res) ? res : (res.items || res.value || []);
    if (items.length > 0) {
      allItems = allItems.concat(items);
      skip += items.length;
      page++;
      // Se retornou menos que o pageSize, acabaram os registros
      if (items.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return allItems;
};

export interface CategoryTreeItem {
  id: string;
  name: string;
  type: string;
  parentName?: string;
  code?: string;
}

let categoryCache: Record<string, CategoryTreeItem> = {};

export const getCategoryTree = async (companyId = '1'): Promise<Record<string, CategoryTreeItem>> => {
  if (Object.keys(categoryCache).length > 0) return categoryCache;

  try {
    const treeRes = await fetchNiboData('schedules/categories/tree', undefined, companyId) || await fetchNiboData('categories', undefined, companyId);
    const items = Array.isArray(treeRes) ? treeRes : (treeRes?.items || treeRes?.value || []);

    const flatten = (list: any[], parent?: string) => {
      list.forEach((cat: any) => {
        const id = cat.categoryId || cat.id;
        const name = cat.name || cat.description;
        if (id && name) {
          categoryCache[id] = {
            id,
            name,
            type: cat.type || '',
            parentName: parent || cat.parentCategoryName || '',
            code: cat.code || ''
          };
        }
        if (cat.subCategories && Array.isArray(cat.subCategories)) {
          flatten(cat.subCategories, name);
        }
        if (cat.categories && Array.isArray(cat.categories)) {
          flatten(cat.categories, name);
        }
      });
    };

    flatten(items);
  } catch (err) {
    console.warn('Não foi possível carregar o plano de categorias do Nibo:', err);
  }

  return categoryCache;
};

// ============================================================================
// LÓGICA DE INTEGRAÇÃO REAL COM A API NIBO
// Mapeamos os endpoints /schedules/debit e /schedules/credit com paginação OData,
// conciliação de liquidações (juros/multas/descontos), e extratos bancários.
// ============================================================================

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

export const getBankAccounts = async (companyId = '1'): Promise<BankAccount[]> => {
  try {
    const res = await fetchNiboData('accounts', undefined, companyId);
    const items: unknown[] = res?.items || [];
    return items
      .map((raw) => validateItem(raw, NiboBankAccountSchema, 'accounts'))
      .filter(Boolean)
      .map((acc) => ({
        id: acc!.id || acc!.accountId || '',
        name: acc!.name,
        bankName: acc!.bankName || 'Conta Corrente',
        openBalance: acc!.openBalance || 0,
        type: acc!.type || 'BankAccount',
        bankAgency: acc!.bankAgency || '',
        bankAccount: acc!.bankAccount || '',
        isVirtual: !!acc!.isVirtual,
        isAutomated: !!acc!.isAutomated
      }));
  } catch (error) {
    console.error('Erro ao buscar contas bancárias Nibo:', error);
    return [];
  }
};

export const getCostCenters = async (companyId = '1'): Promise<CostCenter[]> => {
  try {
    const res = await fetchNiboData('costcenters', undefined, companyId);
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

export const getDirectBankStatements = async (_accounts: BankAccount[]): Promise<Transaction[]> => {
  // A API padrão empresas/v1 do Nibo não expõe sub-rota de extratos de terceiros sem permissão bancária específica.
  // Todos os lançamentos conciliados já constam integralmente em schedules/credit e debit.
  return [];
};

export const getClientData = async (companyId: string) => {

  try {
    // 1. Carregar plano de categorias para enriquecimento
    const categoryTree = await getCategoryTree(companyId);

    // 2. Buscar Receitas e Despesas com Paginação OData Completa
    // Por padrão o Nibo pode filtrar pelo mês atual se não enviarmos um $filter.
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01T00:00:00Z`;
    // API do Nibo utiliza padrão OData v4, logo DateTimeOffset não leva aspas
    // Obrigatório incluir $orderby quando usamos $skip e $filter juntos (limitação do Entity Framework OData)
    const odataParams = { 
      '$filter': `dueDate ge ${startDate}`,
      '$orderby': 'dueDate desc'
    };

    const [rawCredits, rawDebits, bankAccounts] = await Promise.all([
      fetchNiboDataPaginated('schedules/credit', odataParams, 500, 20, companyId),
      fetchNiboDataPaginated('schedules/debit', odataParams, 500, 20, companyId),
      getBankAccounts(companyId)
    ]);

    // Mapear para o formato de Transação do Dashboard
    const mappedTransactions: Transaction[] = [];
    const now = Date.now();

    // Validar contratos de dados com Zod antes de processar
    const validCredits = validateAndFilterItems<typeof NiboCreditScheduleSchema>(
      rawCredits,
      NiboCreditScheduleSchema,
      'schedules/credit'
    );

    validCredits.forEach((item: NiboCreditSchedule) => {
      const catObj = item.categories && item.categories.length > 0 ? item.categories[0] : null;
      const catId = catObj?.categoryId || (item as any).category?.id;
      const cachedCat = catId && categoryTree[catId] ? categoryTree[catId] : null;

      let status: TransactionStatus = 'pendente';
      if (item.isPaid) {
        status = 'pago';
      } else if (item.dueDate && new Date(item.dueDate).getTime() < now) {
        status = 'atrasado';
      }

      const category = catObj?.categoryName || (item as any).category?.name || cachedCat?.name || 'Vendas/Serviços';
      const parentCategory = catObj?.parent || cachedCat?.parentName || 'Receitas operacionais';
      const description = item.description || 'Recebimento';

      // Liquidação real (juros, multas e descontos) — tipados pelo Zod
      const receipts = item.receipts || [];
      let interestValue = 0;
      let fineValue = 0;
      let discountValue = 0;
      let paidValue = item.value;
      let settlementDate = item.dueDate.split('T')[0];

      if (receipts.length > 0) {
        interestValue = receipts.reduce((acc, r) => acc + (r.interestValue || 0), 0);
        fineValue = receipts.reduce((acc, r) => acc + (r.fineValue || 0), 0);
        discountValue = receipts.reduce((acc, r) => acc + (r.discountValue || 0), 0);
        paidValue = receipts.reduce((acc, r) => acc + (r.netValue || r.value || 0), 0);
        if (receipts[0].receiptDate || receipts[0].date) {
          settlementDate = (receipts[0].receiptDate || receipts[0].date)!.split('T')[0];
        }
      } else if (item.paidDate) {
        settlementDate = item.paidDate.split('T')[0];
      }

      const tag = classifyTransactionTag(category, parentCategory, description, 'receita');

      mappedTransactions.push({
        id: item.scheduleId || item.id || '',
        description,
        value: item.value,
        paidValue: item.isPaid ? paidValue : undefined,
        interestValue: interestValue > 0 ? interestValue : undefined,
        fineValue: fineValue > 0 ? fineValue : undefined,
        discountValue: discountValue > 0 ? discountValue : undefined,
        date: item.isPaid && settlementDate ? settlementDate : item.dueDate.split('T')[0],
        dueDate: item.dueDate.split('T')[0],
        settlementDate: item.isPaid ? settlementDate : undefined,
        type: 'receita',
        status,
        category,
        parentCategory,
        clientSupplier: item.stakeholder?.name || 'Cliente Diverso',
        documentNumber: item.reference || '',
        tag,
        source: 'schedule'
      });
    });

    // Validar contratos de dados com Zod antes de processar
    const validDebits = validateAndFilterItems<typeof NiboDebitScheduleSchema>(
      rawDebits,
      NiboDebitScheduleSchema,
      'schedules/debit'
    );

    validDebits.forEach((item: NiboDebitSchedule) => {
      const catObj = item.categories && item.categories.length > 0 ? item.categories[0] : null;
      const catId = catObj?.categoryId || (item as any).category?.id;
      const cachedCat = catId && categoryTree[catId] ? categoryTree[catId] : null;

      let status: TransactionStatus = 'pendente';
      if (item.isPaid) {
        status = 'pago';
      } else if (item.dueDate && new Date(item.dueDate).getTime() < now) {
        status = 'atrasado';
      }

      const category = catObj?.categoryName || (item as any).category?.name || cachedCat?.name || 'Despesas Gerais';
      const parentCategory = catObj?.parent || cachedCat?.parentName || 'Despesas operacionais';
      const description = item.description || 'Pagamento';

      // Liquidação real (juros, multas e descontos) — tipados pelo Zod
      const payments = item.payments || [];
      let interestValue = 0;
      let fineValue = 0;
      let discountValue = 0;
      let paidValue = item.value;
      let settlementDate = item.dueDate.split('T')[0];

      if (payments.length > 0) {
        interestValue = payments.reduce((acc, p) => acc + (p.interestValue || 0), 0);
        fineValue = payments.reduce((acc, p) => acc + (p.fineValue || 0), 0);
        discountValue = payments.reduce((acc, p) => acc + (p.discountValue || 0), 0);
        paidValue = payments.reduce((acc, p) => acc + (p.netValue || p.value || 0), 0);
        if (payments[0].paymentDate || payments[0].date) {
          settlementDate = (payments[0].paymentDate || payments[0].date)!.split('T')[0];
        }
      } else if (item.paidDate) {
        settlementDate = item.paidDate.split('T')[0];
      }

      const tag = classifyTransactionTag(category, parentCategory, description, 'despesa');

      mappedTransactions.push({
        id: item.scheduleId || item.id || '',
        description,
        value: item.value,
        paidValue: item.isPaid ? paidValue : undefined,
        interestValue: interestValue > 0 ? interestValue : undefined,
        fineValue: fineValue > 0 ? fineValue : undefined,
        discountValue: discountValue > 0 ? discountValue : undefined,
        date: item.isPaid && settlementDate ? settlementDate : item.dueDate.split('T')[0],
        dueDate: item.dueDate.split('T')[0],
        settlementDate: item.isPaid ? settlementDate : undefined,
        type: 'despesa',
        status,
        category,
        parentCategory,
        clientSupplier: item.stakeholder?.name || 'Fornecedor',
        documentNumber: item.reference || '',
        tag,
        source: 'schedule'
      });
    });

    // 3. Buscar lançamentos diretos de extratos bancários (ex: tarifas bancárias, CDI)
    const directStatements = await getDirectBankStatements(bankAccounts);
    directStatements.forEach(st => mappedTransactions.push(st));

    // Ordenar por data (mais recente primeiro)
    mappedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 4. Calcular Métricas Reais Baseadas nas Transações
    const receitasPagas = mappedTransactions
      .filter(t => t.type === 'receita' && t.status === 'pago' && t.tag !== 'TRANSFERENCIA_INTERNA')
      .reduce((acc, t) => acc + (t.paidValue !== undefined ? t.paidValue : t.value), 0);

    const despesasPagas = mappedTransactions
      .filter(t => t.type === 'despesa' && t.status === 'pago' && t.tag !== 'TRANSFERENCIA_INTERNA')
      .reduce((acc, t) => acc + (t.paidValue !== undefined ? t.paidValue : t.value), 0);

    const receberMes = mappedTransactions
      .filter(t => t.type === 'receita' && t.status === 'pendente')
      .reduce((acc, t) => acc + t.value, 0);

    const pagarMes = mappedTransactions
      .filter(t => t.type === 'despesa' && t.status === 'pendente')
      .reduce((acc, t) => acc + t.value, 0);

    // Calcular saldo consolidado considerando saldos iniciais de contas + fluxo
    const bankOpenBalanceTotal = bankAccounts.reduce((acc, b) => acc + (b.openBalance || 0), 0);
    const saldoAtual = (bankOpenBalanceTotal > 0 ? bankOpenBalanceTotal : 0) + (receitasPagas - despesasPagas);
    const hasReceitas = mappedTransactions.some(t => t.type === 'receita');

    const metrics: ClientMetrics = {
      saldoAtual: Math.round(saldoAtual * 100) / 100,
      receberMes: Math.round(receberMes * 100) / 100,
      pagarMes: Math.round(pagarMes * 100) / 100,
      ticketMedio: hasReceitas 
        ? Math.round((receitasPagas + receberMes) / mappedTransactions.filter(t => t.type === 'receita').length)
        : 0,
      taxaInadimplencia: 0,
      margemOperacional: receitasPagas > 0 ? Math.round(((receitasPagas - despesasPagas) / receitasPagas) * 100) : 0,
      previsao30dias: Math.round((saldoAtual + (receberMes - pagarMes)) * 100) / 100
    };

    // 5. Agrupar Fluxo de Caixa Mensalmente (Realizado)
    const cashFlowMap: Record<string, { receitas: number; despesas: number; lucro: number }> = {};

    mappedTransactions.forEach(t => {
      if (t.status !== 'pago' || t.tag === 'TRANSFERENCIA_INTERNA') return;
      const dateObj = parseLocalDate(t.date);
      const monthKey = dateObj.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
      const val = t.paidValue !== undefined ? t.paidValue : t.value;

      if (!cashFlowMap[monthKey]) {
        cashFlowMap[monthKey] = { receitas: 0, despesas: 0, lucro: 0 };
      }
      if (t.type === 'receita') cashFlowMap[monthKey].receitas += val;
      if (t.type === 'despesa') cashFlowMap[monthKey].despesas += val;
    });

    const cashFlow = Object.keys(cashFlowMap).map(key => ({
      name: key.replace('.', '').substring(0, 3).toUpperCase(),
      receitas: Math.round(cashFlowMap[key].receitas * 100) / 100,
      despesas: Math.round(cashFlowMap[key].despesas * 100) / 100,
      lucro: Math.round((cashFlowMap[key].receitas - cashFlowMap[key].despesas) * 100) / 100
    })).reverse();

    return {
      metrics,
      cashFlow,
      transactions: mappedTransactions,
    };
  } catch (error) {
    console.error('Falha ao carregar dados da API Nibo.', error);
    throw error instanceof Error
      ? error
      : new Error('Falha ao carregar dados da API Nibo.');
  }
};

export const getDREData = async (companyId: string, period: string = '2026-ytd'): Promise<DREData> => {
  const clientData = await getClientData(companyId);
  const txs = clientData.transactions;

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Filtrar apenas transações pagas/realizadas e aplicar o filtro de período
  const paidTxs = txs.filter(t => {
    if (t.status !== 'pago' || t.tag === 'TRANSFERENCIA_INTERNA' || t.tag === 'INVESTIMENTO_NAO_OPERACIONAL') return false;

    const d = parseLocalDate(t.date);
    if (period === '2026-m') {
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    } else if (period === '2026-q') {
      const diffMonths = (currentYear - d.getFullYear()) * 12 + (currentMonth - d.getMonth());
      return diffMonths >= 0 && diffMonths < 3;
    } else {
      return d.getFullYear() === currentYear;
    }
  });

  let receitaBruta = 0;
  let deducoes = 0;
  let custos = 0;
  let despesasOperacionais = 0;
  let depreciacaoAmortizacao = 0;
  let rendimentosFinanceiros = 0;
  let despesasFinanceiras = 0;
  let impostosLucro = 0;

  const categoryBreakdown: Record<string, { value: number; type: DREItemType; groupCode: string; name: string }> = {};

  paidTxs.forEach(t => {
    const val = t.paidValue !== undefined ? t.paidValue : t.value;
    const catName = t.category?.trim() || 'Geral';
    const tag = t.tag || classifyTransactionTag(t.category, t.parentCategory, t.description, t.type);

    if (t.type === 'receita') {
      if (tag === 'RENDIMENTO_FINANCEIRO') {
        rendimentosFinanceiros += val;
        if (!categoryBreakdown[catName]) {
          categoryBreakdown[catName] = { value: 0, type: 'receita', groupCode: '6.1', name: `Rendimentos: ${catName}` };
        }
        categoryBreakdown[catName].value += val;
      } else {
        receitaBruta += val;
        if (!categoryBreakdown[catName]) {
          categoryBreakdown[catName] = { value: 0, type: 'receita', groupCode: '1.1', name: catName };
        }
        categoryBreakdown[catName].value += val;
      }
    } else {
      // Despesas / Custos / Deduções
      if (tag === 'IMPOSTOS_DEDUCAO' || tag === 'IMPOSTOS') {
        deducoes += val;
        if (!categoryBreakdown[catName]) {
          categoryBreakdown[catName] = { value: 0, type: 'deducao', groupCode: '2.1', name: catName };
        }
        categoryBreakdown[catName].value += val;
      } else if (tag === 'CUSTO_MERCADORIA_SERVICO') {
        custos += val;
        if (!categoryBreakdown[catName]) {
          categoryBreakdown[catName] = { value: 0, type: 'custo', groupCode: '3.1', name: catName };
        }
        categoryBreakdown[catName].value += val;
      } else if (tag === 'DEPRECIACAO_AMORTIZACAO') {
        depreciacaoAmortizacao += val;
        if (!categoryBreakdown[catName]) {
          categoryBreakdown[catName] = { value: 0, type: 'despesa', groupCode: '5.1', name: catName };
        }
        categoryBreakdown[catName].value += val;
      } else if (tag === 'JUROS_FINANCEIRO') {
        despesasFinanceiras += val;
        if (!categoryBreakdown[catName]) {
          categoryBreakdown[catName] = { value: 0, type: 'despesa', groupCode: '6.2', name: catName };
        }
        categoryBreakdown[catName].value += val;
      } else if (tag === 'IMPOSTOS_LUCRO') {
        impostosLucro += val;
        if (!categoryBreakdown[catName]) {
          categoryBreakdown[catName] = { value: 0, type: 'despesa', groupCode: '7.1', name: catName };
        }
        categoryBreakdown[catName].value += val;
      } else {
        // Despesa Operacional normal (SG&A)
        despesasOperacionais += val;
        if (!categoryBreakdown[catName]) {
          categoryBreakdown[catName] = { value: 0, type: 'despesa', groupCode: '4.1', name: catName };
        }
        categoryBreakdown[catName].value += val;
      }
    }
  });

  // Cálculos contábeis rigorosos
  const receitaLiquida = receitaBruta - deducoes;
  const lucroBruto = receitaLiquida - custos;
  const ebitda = lucroBruto - despesasOperacionais; // EBITDA real = Lucro Bruto - Despesas SG&A (sem juros/impostos/depreciação)
  const ebit = ebitda - depreciacaoAmortizacao;
  const resultadoFinanceiro = rendimentosFinanceiros - despesasFinanceiras;
  const lucroLiquido = ebit + resultadoFinanceiro - impostosLucro;

  const items: DRELineItem[] = [];
  let itemIndex = 1;

  // 1. Receita Bruta
  items.push({
    id: `dre-rb`,
    code: '1.0',
    name: 'RECEITA OPERACIONAL BRUTA',
    value: receitaBruta,
    percentage: 100,
    type: 'receita',
    isBold: true
  });

  Object.entries(categoryBreakdown)
    .filter(([, cat]) => cat.groupCode.startsWith('1.'))
    .forEach(([name, cat]) => {
      items.push({
        id: `dre-${itemIndex++}`,
        code: `1.${itemIndex}`,
        name: name,
        value: cat.value,
        percentage: receitaBruta > 0 ? (cat.value / receitaBruta) * 100 : 0,
        type: 'receita',
        isBold: false
      });
    });

  // 2. Deduções da Receita Bruta
  items.push({
    id: `dre-ded`,
    code: '2.0',
    name: '(-) Deduções da Receita e Tributos sobre Faturamento',
    value: -deducoes,
    percentage: receitaBruta > 0 ? -(deducoes / receitaBruta) * 100 : 0,
    type: 'deducao',
    isBold: true
  });

  Object.entries(categoryBreakdown)
    .filter(([, cat]) => cat.groupCode.startsWith('2.'))
    .forEach(([name, cat]) => {
      items.push({
        id: `dre-${itemIndex++}`,
        code: `2.${itemIndex}`,
        name: name,
        value: -cat.value,
        percentage: receitaBruta > 0 ? -(cat.value / receitaBruta) * 100 : 0,
        type: 'deducao',
        isBold: false
      });
    });

  // Subtotal: Receita Líquida
  items.push({
    id: `dre-rl`,
    code: '(=)',
    name: 'RECEITA OPERACIONAL LÍQUIDA',
    value: receitaLiquida,
    percentage: receitaBruta > 0 ? (receitaLiquida / receitaBruta) * 100 : 0,
    type: 'subtotal',
    isBold: true
  });

  // 3. Custos de Vendas / CMV / CSP
  items.push({
    id: `dre-cmv`,
    code: '3.0',
    name: '(-) Custos dos Produtos Vendidos e Serviços Prestados (CMV/CSP)',
    value: -custos,
    percentage: receitaBruta > 0 ? -(custos / receitaBruta) * 100 : 0,
    type: 'custo',
    isBold: true
  });

  Object.entries(categoryBreakdown)
    .filter(([, cat]) => cat.groupCode.startsWith('3.'))
    .forEach(([name, cat]) => {
      items.push({
        id: `dre-${itemIndex++}`,
        code: `3.${itemIndex}`,
        name: name,
        value: -cat.value,
        percentage: receitaBruta > 0 ? -(cat.value / receitaBruta) * 100 : 0,
        type: 'custo',
        isBold: false
      });
    });

  // Subtotal: Lucro Bruto
  items.push({
    id: `dre-lb`,
    code: '(=)',
    name: 'LUCRO BRUTO OPERACIONAL',
    value: lucroBruto,
    percentage: receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0,
    type: 'subtotal',
    isBold: true
  });

  // 4. Despesas Operacionais (SG&A)
  items.push({
    id: `dre-do`,
    code: '4.0',
    name: '(-) Despesas Operacionais e Administrativas (SG&A)',
    value: -despesasOperacionais,
    percentage: receitaBruta > 0 ? -(despesasOperacionais / receitaBruta) * 100 : 0,
    type: 'despesa',
    isBold: true
  });

  Object.entries(categoryBreakdown)
    .filter(([, cat]) => cat.groupCode.startsWith('4.'))
    .forEach(([name, cat]) => {
      items.push({
        id: `dre-${itemIndex++}`,
        code: `4.${itemIndex}`,
        name: name,
        value: -cat.value,
        percentage: receitaBruta > 0 ? -(cat.value / receitaBruta) * 100 : 0,
        type: 'despesa',
        isBold: false
      });
    });

  // Subtotal: EBITDA
  items.push({
    id: `dre-ebitda`,
    code: '(=)',
    name: 'EBITDA / LAJIDA (Geração de Caixa Operacional)',
    value: ebitda,
    percentage: receitaBruta > 0 ? (ebitda / receitaBruta) * 100 : 0,
    type: 'subtotal',
    isBold: true
  });

  // 5. Depreciação e Amortização
  if (depreciacaoAmortizacao > 0) {
    items.push({
      id: `dre-da`,
      code: '5.0',
      name: '(-) Depreciação e Amortização',
      value: -depreciacaoAmortizacao,
      percentage: receitaBruta > 0 ? -(depreciacaoAmortizacao / receitaBruta) * 100 : 0,
      type: 'despesa',
      isBold: false
    });
  }

  // 6. Resultado Financeiro Líquido
  if (rendimentosFinanceiros > 0 || despesasFinanceiras > 0) {
    items.push({
      id: `dre-rf`,
      code: '6.0',
      name: '(+/-) Resultado Financeiro Líquido (Juros, Tarifas e Rendimentos)',
      value: resultadoFinanceiro,
      percentage: receitaBruta > 0 ? (resultadoFinanceiro / receitaBruta) * 100 : 0,
      type: 'subtotal',
      isBold: false
    });
  }

  // 7. Impostos sobre o Lucro
  if (impostosLucro > 0) {
    items.push({
      id: `dre-tax`,
      code: '7.0',
      name: '(-) Provisão de IRPJ e CSLL sobre Lucro',
      value: -impostosLucro,
      percentage: receitaBruta > 0 ? -(impostosLucro / receitaBruta) * 100 : 0,
      type: 'despesa',
      isBold: false
    });
  }

  // Subtotal Final: Lucro Líquido
  items.push({
    id: `dre-ll`,
    code: '(=)',
    name: 'LUCRO / PREJUÍZO LÍQUIDO DO EXERCÍCIO',
    value: lucroLiquido,
    percentage: receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0,
    type: 'lucro',
    isBold: true
  });

  return {
    receitaBruta: Math.round(receitaBruta * 100) / 100,
    impostosDeducoes: Math.round(deducoes * 100) / 100,
    receitaLiquida: Math.round(receitaLiquida * 100) / 100,
    custosVendas: Math.round(custos * 100) / 100,
    lucroBruto: Math.round(lucroBruto * 100) / 100,
    despesasOperacionais: Math.round(despesasOperacionais * 100) / 100,
    ebitda: Math.round(ebitda * 100) / 100,
    lucroLiquido: Math.round(lucroLiquido * 100) / 100,
    margemEbitda: receitaBruta > 0 ? Math.round((ebitda / receitaBruta) * 1000) / 10 : 0,
    margemLiquida: receitaBruta > 0 ? Math.round((lucroLiquido / receitaBruta) * 1000) / 10 : 0,
    items
  };
};

export const getCashFlowData = async (companyId: string): Promise<DetailedCashFlowData> => {
  const clientData = await getClientData(companyId);
  const txs = clientData.transactions;

  // Gerar fluxo de caixa diário baseado nas transações pagas (Realizado)
  const dailyFlowMap: Record<string, { in: number; out: number }> = {};

  txs.forEach(t => {
    if (t.status !== 'pago' || t.tag === 'TRANSFERENCIA_INTERNA') return;
    const dateObj = parseLocalDate(t.date);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const dayKey = `${year}-${month}-${day}`;
    const val = t.paidValue !== undefined ? t.paidValue : t.value;

    if (!dailyFlowMap[dayKey]) dailyFlowMap[dayKey] = { in: 0, out: 0 };
    if (t.type === 'receita') dailyFlowMap[dayKey].in += val;
    if (t.type === 'despesa') dailyFlowMap[dayKey].out += val;
  });

  // Calcular saldos
  const totalEntradas = txs
    .filter(t => t.type === 'receita' && t.status === 'pago' && t.tag !== 'TRANSFERENCIA_INTERNA')
    .reduce((acc, t) => acc + (t.paidValue !== undefined ? t.paidValue : t.value), 0);

  const totalSaidas = txs
    .filter(t => t.type === 'despesa' && t.status === 'pago' && t.tag !== 'TRANSFERENCIA_INTERNA')
    .reduce((acc, t) => acc + (t.paidValue !== undefined ? t.paidValue : t.value), 0);

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
        dayName: '',
        entradas: Math.round(entradas * 100) / 100,
        saidas: Math.round(saidas * 100) / 100,
        resultado: Math.round(resultado * 100) / 100,
        saldoAcumulado: Math.round(saldoAcumuladoLoop * 100) / 100,
        status: 'realizado' as const
      };
    });

  const colorsIn = ['var(--success)', 'var(--primary)', 'var(--warning)', 'var(--purple)'];
  const colorsOut = ['var(--danger)', 'var(--warning)', 'var(--purple)', 'var(--secondary)'];

  // Agregar top categorias de entradas
  const inCategoryMap: Record<string, number> = {};
  txs.filter(t => t.type === 'receita' && t.status === 'pago' && t.tag !== 'TRANSFERENCIA_INTERNA').forEach(t => {
    const val = t.paidValue !== undefined ? t.paidValue : t.value;
    inCategoryMap[t.category] = (inCategoryMap[t.category] || 0) + val;
  });

  const topEntradasCategories = Object.entries(inCategoryMap)
    .map(([name, value], index) => ({ 
      category: name, 
      value: Math.round(value * 100) / 100, 
      percentage: totalEntradas > 0 ? Math.round((value / totalEntradas) * 1000) / 10 : 0,
      type: 'entrada' as const,
      color: colorsIn[index % colorsIn.length]
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  // Agregar top categorias de saídas
  const outCategoryMap: Record<string, number> = {};
  txs.filter(t => t.type === 'despesa' && t.status === 'pago' && t.tag !== 'TRANSFERENCIA_INTERNA').forEach(t => {
    const val = t.paidValue !== undefined ? t.paidValue : t.value;
    outCategoryMap[t.category] = (outCategoryMap[t.category] || 0) + val;
  });

  const topSaidasCategories = Object.entries(outCategoryMap)
    .map(([name, value], index) => ({ 
      category: name, 
      value: Math.round(value * 100) / 100, 
      percentage: totalSaidas > 0 ? Math.round((value / totalSaidas) * 1000) / 10 : 0,
      type: 'saida' as const,
      color: colorsOut[index % colorsOut.length]
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  return {
    saldoInicial: Math.round(saldoInicial * 100) / 100,
    totalEntradas: Math.round(totalEntradas * 100) / 100,
    totalSaidas: Math.round(totalSaidas * 100) / 100,
    resultadoLiquido: Math.round(resultadoLiquido * 100) / 100,
    saldoFinal: Math.round(saldoFinal * 100) / 100,
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
    const d = parseLocalDate(t.dueDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalReceber = currentMonthTxs.filter(t => t.type === 'receita').reduce((a, b) => a + b.value, 0);
  const totalRecebido = currentMonthTxs.filter(t => t.type === 'receita' && t.status === 'pago').reduce((a, b) => a + (b.paidValue !== undefined ? b.paidValue : b.value), 0);
  const totalPagar = currentMonthTxs.filter(t => t.type === 'despesa').reduce((a, b) => a + b.value, 0);
  const totalPago = currentMonthTxs.filter(t => t.type === 'despesa' && t.status === 'pago').reduce((a, b) => a + (b.paidValue !== undefined ? b.paidValue : b.value), 0);

  // Títulos em atraso independem do mês
  const contasAtrasadasReceber = txs.filter(t => t.type === 'receita' && t.status === 'atrasado');
  const contasAtrasadasPagar = txs.filter(t => t.type === 'despesa' && t.status === 'atrasado');

  const totalAtrasadoReceber = contasAtrasadasReceber.reduce((a, b) => a + b.value, 0);
  const totalAtrasadoPagar = contasAtrasadasPagar.reduce((a, b) => a + b.value, 0);

  return {
    totalReceber: Math.round(totalReceber * 100) / 100,
    totalRecebido: Math.round(totalRecebido * 100) / 100,
    totalPagar: Math.round(totalPagar * 100) / 100,
    totalPago: Math.round(totalPago * 100) / 100,
    totalAtrasadoReceber: Math.round(totalAtrasadoReceber * 100) / 100,
    totalAtrasadoPagar: Math.round(totalAtrasadoPagar * 100) / 100,
    countAtrasados: contasAtrasadasReceber.length + contasAtrasadasPagar.length,
    accounts: txs
  };
};

export const getStakeholders = async (companyId: string): Promise<Stakeholder[]> => {
  try {
    const res = await fetchNiboData('stakeholders', undefined, companyId);
    const clientData = await getClientData(companyId);
    const txs = clientData.transactions;

    const items = res?.items || [];
    return items.map((stk: any) => {
      const matchTxs = txs.filter(t => t.clientSupplier?.toLowerCase() === stk.name?.toLowerCase());
      const totalValue = matchTxs.reduce((acc, t) => acc + (t.paidValue !== undefined ? t.paidValue : t.value), 0);

      return {
        id: stk.id,
        name: stk.name || 'Sem Nome',
        type: stk.type === 'Customer' ? 'Customer' : 'Supplier',
        documentNumber: stk.document?.number || 'Não informado',
        documentType: stk.document?.type || (stk.isCompany ? 'Cnpj' : 'Cpf'),
        isCompany: !!stk.isCompany,
        totalValue: Math.round(totalValue * 100) / 100,
        countTransactions: matchTxs.length
      };
    });
  } catch (error) {
    console.error('Erro ao buscar clientes e fornecedores Nibo:', error);
    throw error instanceof Error
      ? error
      : new Error('Erro ao buscar clientes e fornecedores Nibo.');
  }
};

export const getFinancialHealthAnalysis = async (
  companyId: string, 
  period: string = '2026-ytd',
  customStartDate?: string,
  customEndDate?: string
): Promise<FinancialHealthAnalysis> => {
  const clientData = await getClientData(companyId);
  const txs = clientData.transactions;

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Filtrar transações pagas conforme o período selecionado (expurgando transferências e investimentos puros)
  const paidTxs = txs.filter(t => {
    if (t.status !== 'pago' || t.tag === 'TRANSFERENCIA_INTERNA' || t.tag === 'INVESTIMENTO_NAO_OPERACIONAL') return false;
    const txDate = t.date ? t.date.substring(0, 10) : '';
    const d = parseLocalDate(t.date);

    if (period === 'custom' && customStartDate && customEndDate) {
      return txDate >= customStartDate && txDate <= customEndDate;
    }
    if (period === '2026-m') {
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }
    if (period === '2026-q') {
      const diffMonths = (currentYear - d.getFullYear()) * 12 + (currentMonth - d.getMonth());
      return diffMonths >= 0 && diffMonths < 3;
    }
    return d.getFullYear() === currentYear;
  });

  let totalRevenue = 0;
  let operationalExpenses = 0;
  let directCosts = 0;
  let jurosFinanceiro = 0;
  let rendimentoFinanceiro = 0;
  let impostosDeducao = 0;
  let impostosLucro = 0;
  let depreciacaoAmortizacao = 0;
  let fixedExpenses = 0;
  let variableExpenses = 0;

  paidTxs.forEach(t => {
    const val = t.paidValue !== undefined ? t.paidValue : t.value;
    const tag = t.tag || classifyTransactionTag(t.category, t.parentCategory, t.description, t.type);

    if (t.type === 'receita') {
      if (tag === 'RENDIMENTO_FINANCEIRO') {
        rendimentoFinanceiro += val;
      } else {
        totalRevenue += val;
      }
    } else {
      if (tag === 'JUROS_FINANCEIRO') {
        jurosFinanceiro += val;
      } else if (tag === 'IMPOSTOS_DEDUCAO' || tag === 'IMPOSTOS') {
        impostosDeducao += val;
        variableExpenses += val;
      } else if (tag === 'IMPOSTOS_LUCRO') {
        impostosLucro += val;
      } else if (tag === 'DEPRECIACAO_AMORTIZACAO') {
        depreciacaoAmortizacao += val;
      } else if (tag === 'CUSTO_MERCADORIA_SERVICO') {
        directCosts += val;
        variableExpenses += val;
      } else {
        // Despesas Operacionais SG&A
        operationalExpenses += val;
        const nameUpper = (t.category + ' ' + (t.parentCategory || '')).toUpperCase();
        if (
          nameUpper.includes('FOLHA') || 
          nameUpper.includes('ALUGUEL') || 
          nameUpper.includes('INFRA') || 
          nameUpper.includes('SOFTWARE') || 
          nameUpper.includes('HONORAR') ||
          nameUpper.includes('CONTABIL') ||
          nameUpper.includes('LIMPEZA') ||
          nameUpper.includes('INTERNET')
        ) {
          fixedExpenses += val;
        } else {
          variableExpenses += val;
        }
      }
    }
  });

  // Se não houver despesas fixas explícitas, inferir proporção segura
  if (fixedExpenses === 0 && operationalExpenses > 0) {
    fixedExpenses = operationalExpenses * 0.65;
    variableExpenses = (operationalExpenses * 0.35) + directCosts + impostosDeducao;
  }

  // EBITDA = Receita Líquida - Custos Diretos - Despesas Operacionais SG&A
  const receitaLiquida = Math.max(totalRevenue - impostosDeducao, 0);
  const totalCustosOperacionais = directCosts + operationalExpenses;
  const ebitda = receitaLiquida - totalCustosOperacionais;
  const margemEbitda = totalRevenue > 0 ? (ebitda / totalRevenue) * 100 : 0;

  // Lucro Líquido = EBITDA - Depreciação + Rendimento Fin. - Juros Fin. - Impostos Lucro
  const totalImpostos = impostosDeducao + impostosLucro;
  const lucroLiquido = ebitda - depreciacaoAmortizacao + (rendimentoFinanceiro - jurosFinanceiro) - impostosLucro;

  const contributionMarginValue = Math.max(totalRevenue - variableExpenses, 0);
  const contributionMarginPercent = totalRevenue > 0 ? (contributionMarginValue / totalRevenue) : 0.45;

  const breakEvenPoint = contributionMarginPercent > 0 ? fixedExpenses / contributionMarginPercent : fixedExpenses * 1.5;
  const safetyMarginValue = totalRevenue - breakEvenPoint;
  const safetyMarginPercent = totalRevenue > 0 ? (safetyMarginValue / totalRevenue) * 100 : 0;

  // Gerar dados temporais para os gráficos de acordo com a granularidade do filtro
  let ebitdaEvolution: EbitdaMonthlyItem[] = [];
  let monthlyBreakdown: BreakEvenAnalysis['monthlyBreakdown'] = [];

  const isShortRange = period === '2026-m' || (period === 'custom' && customStartDate && customEndDate && 
    (new Date(customEndDate).getTime() - new Date(customStartDate).getTime()) <= (35 * 24 * 60 * 60 * 1000));

  if (isShortRange) {
    // Agrupar por semana (Sem 1, Sem 2, Sem 3, Sem 4, Sem 5)
    const weekMap: Record<string, { rev: number; opEx: number; fixed: number; varEx: number }> = {
      'Sem 1 (1-7)': { rev: 0, opEx: 0, fixed: 0, varEx: 0 },
      'Sem 2 (8-14)': { rev: 0, opEx: 0, fixed: 0, varEx: 0 },
      'Sem 3 (15-21)': { rev: 0, opEx: 0, fixed: 0, varEx: 0 },
      'Sem 4 (22-28)': { rev: 0, opEx: 0, fixed: 0, varEx: 0 },
      'Sem 5 (29+)': { rev: 0, opEx: 0, fixed: 0, varEx: 0 }
    };

    paidTxs.forEach(t => {
      const d = parseLocalDate(t.date);
      const day = d.getDate();
      let wKey = 'Sem 1 (1-7)';
      if (day > 28) wKey = 'Sem 5 (29+)';
      else if (day > 21) wKey = 'Sem 4 (22-28)';
      else if (day > 14) wKey = 'Sem 3 (15-21)';
      else if (day > 7) wKey = 'Sem 2 (8-14)';

      const val = t.paidValue !== undefined ? t.paidValue : t.value;
      const tag = t.tag || classifyTransactionTag(t.category, t.parentCategory, t.description, t.type);

      if (t.type === 'receita' && tag !== 'RENDIMENTO_FINANCEIRO') {
        weekMap[wKey].rev += val;
      } else if (tag === 'OPERACIONAL' || tag === 'CUSTO_MERCADORIA_SERVICO') {
        weekMap[wKey].opEx += val;
        if (tag === 'CUSTO_MERCADORIA_SERVICO') {
          weekMap[wKey].varEx += val;
        } else {
          weekMap[wKey].fixed += val * 0.65;
          weekMap[wKey].varEx += val * 0.35;
        }
      }
    });

    ebitdaEvolution = Object.keys(weekMap).map(w => {
      const item = weekMap[w];
      const itemEbitda = item.rev - item.opEx;
      return {
        month: w,
        receitaLiquida: Math.round(item.rev * 100) / 100,
        custosOperacionais: Math.round(item.opEx * 100) / 100,
        ebitda: Math.round(itemEbitda * 100) / 100,
        margemEbitda: item.rev > 0 ? Math.round((itemEbitda / item.rev) * 1000) / 10 : 0,
        lucroLiquido: Math.round(itemEbitda * 0.85 * 100) / 100
      };
    });

    monthlyBreakdown = Object.keys(weekMap).map(w => {
      const item = weekMap[w];
      const mc = item.rev > 0 ? (item.rev - item.varEx) / item.rev : 0.45;
      const pe = mc > 0 ? item.fixed / mc : item.fixed * 1.5;
      return {
        month: w,
        faturamento: Math.round(item.rev * 100) / 100,
        custosFixos: Math.round(item.fixed * 100) / 100,
        custosTotais: Math.round(item.opEx * 100) / 100,
        pontoEquilibrio: Math.round(pe * 100) / 100
      };
    });
  } else {
    // Agrupar por mês
    const monthlyMap: Record<string, { rev: number; opEx: number; fixed: number; varEx: number; dateOrder: number }> = {};

    paidTxs.forEach(t => {
      const d = parseLocalDate(t.date);
      const monthKey = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
      const dateOrder = d.getFullYear() * 12 + d.getMonth();
      const val = t.paidValue !== undefined ? t.paidValue : t.value;
      const tag = t.tag || classifyTransactionTag(t.category, t.parentCategory, t.description, t.type);

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { rev: 0, opEx: 0, fixed: 0, varEx: 0, dateOrder };
      }

      if (t.type === 'receita' && tag !== 'RENDIMENTO_FINANCEIRO') {
        monthlyMap[monthKey].rev += val;
      } else if (tag === 'OPERACIONAL' || tag === 'CUSTO_MERCADORIA_SERVICO') {
        monthlyMap[monthKey].opEx += val;
        if (tag === 'CUSTO_MERCADORIA_SERVICO') {
          monthlyMap[monthKey].varEx += val;
        } else {
          monthlyMap[monthKey].fixed += val * 0.65;
          monthlyMap[monthKey].varEx += val * 0.35;
        }
      }
    });

    const sortedMonths = Object.keys(monthlyMap).sort((a, b) => monthlyMap[a].dateOrder - monthlyMap[b].dateOrder);

    ebitdaEvolution = sortedMonths.map(m => {
      const item = monthlyMap[m];
      const itemEbitda = item.rev - item.opEx;
      return {
        month: m,
        receitaLiquida: Math.round(item.rev * 100) / 100,
        custosOperacionais: Math.round(item.opEx * 100) / 100,
        ebitda: Math.round(itemEbitda * 100) / 100,
        margemEbitda: item.rev > 0 ? Math.round((itemEbitda / item.rev) * 1000) / 10 : 0,
        lucroLiquido: Math.round(itemEbitda * 0.85 * 100) / 100
      };
    });

    monthlyBreakdown = sortedMonths.map(m => {
      const item = monthlyMap[m];
      const mc = item.rev > 0 ? (item.rev - item.varEx) / item.rev : 0.45;
      const pe = mc > 0 ? item.fixed / mc : item.fixed * 1.5;
      return {
        month: m,
        faturamento: Math.round(item.rev * 100) / 100,
        custosFixos: Math.round(item.fixed * 100) / 100,
        custosTotais: Math.round(item.opEx * 100) / 100,
        pontoEquilibrio: Math.round(pe * 100) / 100
      };
    });
  }

  // Se não houver dados no agrupamento, retornar ao menos 1 ponto base do período
  if (ebitdaEvolution.length === 0) {
    ebitdaEvolution = [{
      month: period === '2026-m' ? 'Mês Atual' : 'Período',
      receitaLiquida: Math.round(totalRevenue * 100) / 100,
      custosOperacionais: Math.round(totalCustosOperacionais * 100) / 100,
      ebitda: Math.round(ebitda * 100) / 100,
      margemEbitda: Math.round(margemEbitda * 10) / 10,
      lucroLiquido: Math.round(lucroLiquido * 100) / 100
    }];
    monthlyBreakdown = [{
      month: period === '2026-m' ? 'Mês Atual' : 'Período',
      faturamento: Math.round(totalRevenue * 100) / 100,
      custosFixos: Math.round(fixedExpenses * 100) / 100,
      custosTotais: Math.round(totalCustosOperacionais * 100) / 100,
      pontoEquilibrio: Math.round(breakEvenPoint * 100) / 100
    }];
  }

  return {
    ebitda: Math.round(ebitda * 100) / 100,
    margemEbitda: Math.round(margemEbitda * 10) / 10,
    jurosFinanceiro: Math.round(jurosFinanceiro * 100) / 100,
    impostos: Math.round(totalImpostos * 100) / 100,
    depreciacaoAmortizacao: Math.round(depreciacaoAmortizacao * 100) / 100,
    lucroLiquido: Math.round(lucroLiquido * 100) / 100,
    breakEven: {
      fixedExpenses: Math.round(fixedExpenses * 100) / 100,
      variableExpenses: Math.round(variableExpenses * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      contributionMarginValue: Math.round(contributionMarginValue * 100) / 100,
      contributionMarginPercent: Math.round(contributionMarginPercent * 1000) / 10,
      breakEvenPoint: Math.round(breakEvenPoint * 100) / 100,
      safetyMarginValue: Math.round(safetyMarginValue * 100) / 100,
      safetyMarginPercent: Math.round(safetyMarginPercent * 10) / 10,
      monthlyBreakdown
    },
    ebitdaEvolution
  };
};
