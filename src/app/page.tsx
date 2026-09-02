'use client';

import { useEffect, useState, useMemo } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { 
  getClientData, 
  getBankAccounts, 
  getCostCenters, 
  ClientMetrics, 
  Transaction, 
  BankAccount, 
  CostCenter 
} from '@/lib/api/niboClient';
import { exportFinancialsToExcel, exportFinancialsToCSV } from '@/lib/utils/exportToExcel';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Wallet, 
  TrendingUp, 
  AlertCircle, 
  Download, 
  Plus, 
  Building2, 
  Calendar as CalendarIcon,
  Activity,
  X,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Landmark,
  Layers
} from 'lucide-react';

export default function DashboardPage() {
  const { selectedCompany } = useCompany();
  const [data, setData] = useState<{ metrics: ClientMetrics; cashFlow: any[]; transactions: Transaction[] } | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Estado do Filtro de Período
  const [period, setPeriod] = useState<'30d' | '90d' | 'year' | 'custom'>('30d');
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-08-31');
  
  const [chartView, setChartView] = useState<'all' | 'lucro'>('all');
  
  // Estado dos Modais e Menus
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportToastMessage, setExportToastMessage] = useState<string | null>(null);
  
  // Formulário do Novo Lançamento
  const [newForm, setNewForm] = useState({
    type: 'receita' as 'receita' | 'despesa',
    description: '',
    value: '',
    category: 'SaaS Subscriptions',
    clientSupplier: '',
    date: '2026-08-24',
    status: 'pago' as 'pago' | 'pendente'
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [res, banks, cc] = await Promise.all([
          getClientData(selectedCompany.id),
          getBankAccounts(selectedCompany.id),
          getCostCenters(selectedCompany.id)
        ]);
        setData(res);
        setBankAccounts(banks);
        setCostCenters(cc);
      } catch (err) {
        setData(null);
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar o Nibo.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCompany.id, retryCount]);

  // -------------------------------------------------------------
  // LÓGICA DE FILTRAGEM REAL E DINÂMICA POR DATA
  // -------------------------------------------------------------
  const { filteredTransactions, computedMetrics, displayCashFlow } = useMemo(() => {
    if (!data) return { filteredTransactions: [], computedMetrics: null, displayCashFlow: [] };

    let minDate = '2026-08-01';
    let maxDate = '2026-08-31';

    if (period === '30d') {
      minDate = '2026-08-01';
      maxDate = '2026-08-31';
    } else if (period === '90d') {
      minDate = '2026-06-01';
      maxDate = '2026-08-31';
    } else if (period === 'year') {
      minDate = '2026-01-01';
      maxDate = '2026-12-31';
    } else if (period === 'custom') {
      minDate = startDate;
      maxDate = endDate;
    }

    // 1. Filtrar Transações no Período
    const txs = data.transactions.filter(t => t.date >= minDate && t.date <= maxDate);

    // 2. Recalcular KPIs Financeiros com base nas transações do período
    const receitasPagas = txs.filter(t => t.type === 'receita' && t.status === 'pago').reduce((sum, t) => sum + t.value, 0);
    const despesasPagas = txs.filter(t => t.type === 'despesa' && t.status === 'pago').reduce((sum, t) => sum + t.value, 0);
    
    const receitasPendentes = txs.filter(t => t.type === 'receita' && t.status === 'pendente').reduce((sum, t) => sum + t.value, 0);
    const despesasPendentes = txs.filter(t => t.type === 'despesa' && t.status === 'pendente').reduce((sum, t) => sum + t.value, 0);

    const saldoCalculado = data.metrics.saldoAtual + (receitasPagas - despesasPagas);

    const computedMetrics: ClientMetrics = {
      saldoAtual: saldoCalculado,
      receberMes: receitasPendentes > 0 ? receitasPendentes : data.metrics.receberMes,
      pagarMes: despesasPendentes > 0 ? despesasPendentes : data.metrics.pagarMes,
      ticketMedio: txs.length > 0 ? Math.round((receitasPagas + receitasPendentes) / (txs.length || 1)) : data.metrics.ticketMedio,
      taxaInadimplencia: data.metrics.taxaInadimplencia,
      margemOperacional: data.metrics.margemOperacional,
      previsao30dias: saldoCalculado + (receitasPendentes - despesasPendentes)
    };

    // 3. Ajustar Gráfico de Acordo com Período
    let cashFlowSlice = data.cashFlow;
    if (period === '30d') cashFlowSlice = data.cashFlow.slice(-2);
    else if (period === '90d') cashFlowSlice = data.cashFlow.slice(-4);
    else if (period === 'year') cashFlowSlice = data.cashFlow;

    return {
      filteredTransactions: txs.length > 0 ? txs : data.transactions, // Fallback se não houver registros no range
      computedMetrics,
      displayCashFlow: cashFlowSlice
    };
  }, [data, period, startDate, endDate]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data || !computedMetrics) {
    return <ErrorState message={error ?? undefined} onRetry={() => setRetryCount(c => c + 1)} />;
  }

  // Ação Exportar Excel (.xlsx)
  const handleExportXLSX = () => {
    let periodName = period as string;
    if (period === 'custom') {
      periodName = `${startDate}_a_${endDate}`;
    }

    exportFinancialsToExcel({
      company: selectedCompany,
      metrics: computedMetrics,
      cashFlow: displayCashFlow,
      transactions: filteredTransactions,
      period: periodName
    });

    setIsExportMenuOpen(false);
    setExportToastMessage('Planilha Excel (.XLSX) com gráficos gerada!');
    setTimeout(() => setExportToastMessage(null), 4000);
  };

  // Ação Exportar CSV (.csv)
  const handleExportCSV = () => {
    let periodName = period as string;
    if (period === 'custom') {
      periodName = `${startDate}_a_${endDate}`;
    }

    exportFinancialsToCSV({
      company: selectedCompany,
      transactions: filteredTransactions,
      period: periodName
    });

    setIsExportMenuOpen(false);
    setExportToastMessage('Arquivo CSV Nibo exportado com sucesso!');
    setTimeout(() => setExportToastMessage(null), 4000);
  };

  // Submit do Novo Lançamento
  const handleCreateTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newForm.description || !newForm.value) return;

    const val = Number.parseFloat(newForm.value) || 0;

    const newTx: Transaction = {
      id: String(Date.now()),
      description: newForm.description,
      value: val,
      date: newForm.date,
      dueDate: newForm.date,
      documentNumber: `DOC-${Date.now().toString().slice(-4)}`,
      type: newForm.type,
      status: newForm.status,
      category: newForm.category,
      clientSupplier: newForm.clientSupplier || selectedCompany.name
    };

    // Atualizar dados do cliente imediatamente no estado
    const updatedTransactions = [newTx, ...data.transactions];
    
    setData({
      ...data,
      transactions: updatedTransactions
    });

    setNewForm({
      type: 'receita',
      description: '',
      value: '',
      category: 'SaaS Subscriptions',
      clientSupplier: '',
      date: '2026-08-24',
      status: 'pago'
    });
    setIsModalOpen(false);
  };

  // Descrição do Período Formatada
  let periodDescription = `Personalizado (${startDate} a ${endDate})`;
  if (period === '30d') {
    periodDescription = 'Este Mês (Agosto 2026)';
  } else if (period === '90d') {
    periodDescription = 'Trimestre (Jun-Ago 2026)';
  } else if (period === 'year') {
    periodDescription = 'Ano 2026';
  }

  let periodFilterSummary = `${startDate} a ${endDate}`;
  if (period === '30d') {
    periodFilterSummary = 'Este Mês';
  } else if (period === '90d') {
    periodFilterSummary = 'Trimestre';
  } else if (period === 'year') {
    periodFilterSummary = 'Ano 2026';
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Toast de Confirmação */}
      {exportToastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 border border-slate-700 animate-fade-in">
          <CheckCircle2 size={24} className="text-emerald-400" />
          <div>
            <div className="font-bold text-sm">Download Concluído!</div>
            <div className="text-xs text-slate-300">{exportToastMessage}</div>
          </div>
        </div>
      )}

      {/* Top Header do Cliente & Controles */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-primary font-bold text-xl">
            <Building2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{selectedCompany.name}</h1>
              <span className="badge badge-primary">{selectedCompany.segment}</span>
            </div>
            <p className="text-xs text-muted mt-1">
              CNPJ: <span className="font-semibold text-secondary">{selectedCompany.cnpj}</span> • Conexão Nibo API: <span className="text-success font-semibold">Ativa</span>
            </p>
          </div>
        </div>

        {/* Filtros de Período e Botões Interativos */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletor de Centro de Custo */}
          {costCenters.length > 0 && (
            <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 px-3 rounded-lg border border-gray-200 text-xs">
              <Layers size={15} className="text-primary" />
              <span className="text-muted font-medium">Centro de Custo:</span>
              <select 
                value={selectedCostCenter} 
                onChange={(e) => setSelectedCostCenter(e.target.value)}
                className="bg-transparent font-semibold outline-none cursor-pointer text-secondary"
              >
                <option value="all">Todos ({costCenters.length})</option>
                {costCenters.map(cc => (
                  <option key={cc.costCenterId} value={cc.costCenterId}>{cc.description}</option>
                ))}
              </select>
            </div>
          )}

          {/* Seletor de Período Funcional */}
          <div className="tabs-container">
            <button 
              type="button"
              className={`tab-btn ${period === '30d' ? 'active' : ''}`}
              onClick={() => setPeriod('30d')}
            >
              Este Mês
            </button>
            <button 
              type="button"
              className={`tab-btn ${period === '90d' ? 'active' : ''}`}
              onClick={() => setPeriod('90d')}
            >
              Trimestre
            </button>
            <button 
              type="button"
              className={`tab-btn ${period === 'year' ? 'active' : ''}`}
              onClick={() => setPeriod('year')}
            >
              Ano 2026
            </button>
            <button 
              type="button"
              className={`tab-btn ${period === 'custom' ? 'active' : ''}`}
              onClick={() => setPeriod('custom')}
            >
              Personalizado
            </button>
          </div>

          {/* Inputs de Data quando "Personalizado" estiver selecionado */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 px-3 rounded-lg border border-gray-200 animate-fade-in">
              <CalendarIcon size={16} className="text-primary" />
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs border-none bg-transparent font-semibold outline-none cursor-pointer"
              />
              <span className="text-xs text-muted">até</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs border-none bg-transparent font-semibold outline-none cursor-pointer"
              />
            </div>
          )}

          {/* Menu Dropdown de Exportação */}
          <div className="relative">
            <button 
              type="button"
              className="btn btn-outline gap-2 text-xs"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            >
              <Download size={16} />
              Exportar Nibo
              <ChevronDown size={14} className="text-muted" />
            </button>

            {isExportMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-50 flex flex-col gap-1 animate-fade-in"
              >
                <button 
                  type="button"
                  className="flex items-center gap-3 p-2.5 rounded-lg text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors w-full text-left"
                  onClick={handleExportXLSX}
                >
                  <FileSpreadsheet size={18} className="text-emerald-600" />
                  <div>
                    <div>Exportar Excel (.XLSX)</div>
                    <div className="text-muted font-normal text-[0.65rem]">Com abas, gráficos e totais</div>
                  </div>
                </button>

                <button 
                  type="button"
                  className="flex items-center gap-3 p-2.5 rounded-lg text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-primary transition-colors w-full text-left border-t border-gray-100"
                  onClick={handleExportCSV}
                >
                  <FileText size={18} className="text-primary" />
                  <div>
                    <div>Exportar CSV (.CSV)</div>
                    <div className="text-muted font-normal text-[0.65rem]">Formato leve para sistemas</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Botão Novo Lançamento */}
          <button 
            type="button"
            className="btn btn-primary gap-2 text-xs" 
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* Modal de Novo Lançamento Financeiro */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h2 className="font-bold text-lg">Novo Lançamento — {selectedCompany.name}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-muted hover:text-danger">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button 
                  type="button" 
                  className={`btn flex-1 ${newForm.type === 'receita' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setNewForm({ ...newForm, type: 'receita' })}
                >
                  <ArrowUpRight size={16} /> Receita (+)
                </button>
                <button 
                  type="button" 
                  className={`btn flex-1 ${newForm.type === 'despesa' ? 'btn-primary' : 'btn-outline'}`}
                  style={newForm.type === 'despesa' ? { backgroundColor: 'var(--danger)' } : {}}
                  onClick={() => setNewForm({ ...newForm, type: 'despesa' })}
                >
                  <ArrowDownRight size={16} /> Despesa (-)
                </button>
              </div>

              <div>
                <label htmlFor="form-description" className="text-xs font-semibold text-muted mb-1 block">Descrição</label>
                <input 
                  id="form-description"
                  type="text" 
                  required
                  placeholder="Ex: Assinatura de Software, Aluguel..." 
                  className="input-field"
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                />
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label htmlFor="form-value" className="text-xs font-semibold text-muted mb-1 block">Valor (R$)</label>
                  <input 
                    id="form-value"
                    type="number" 
                    step="0.01"
                    required
                    placeholder="0.00" 
                    className="input-field"
                    value={newForm.value}
                    onChange={(e) => setNewForm({ ...newForm, value: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="form-category" className="text-xs font-semibold text-muted mb-1 block">Categoria</label>
                  <select 
                    id="form-category"
                    className="input-field"
                    value={newForm.category}
                    onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
                  >
                    <option value="SaaS Subscriptions">SaaS Subscriptions</option>
                    <option value="Infraestrutura TI">Infraestrutura TI</option>
                    <option value="Serviços Profissionais">Serviços Profissionais</option>
                    <option value="Recursos Humanos">Recursos Humanos</option>
                    <option value="Softwares">Softwares</option>
                    <option value="Vendas Varejo">Vendas Varejo</option>
                    <option value="Impostos">Impostos</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label htmlFor="form-client" className="text-xs font-semibold text-muted mb-1 block">Cliente / Fornecedor</label>
                  <input 
                    id="form-client"
                    type="text" 
                    placeholder="Ex: AWS, TechCorp, Cliente X" 
                    className="input-field"
                    value={newForm.clientSupplier}
                    onChange={(e) => setNewForm({ ...newForm, clientSupplier: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="form-date" className="text-xs font-semibold text-muted mb-1 block">Data</label>
                  <input 
                    id="form-date"
                    type="date" 
                    className="input-field"
                    value={newForm.date}
                    onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="form-status" className="text-xs font-semibold text-muted mb-1 block">Status</label>
                <select 
                  id="form-status"
                  className="input-field"
                  value={newForm.status}
                  onChange={(e) => setNewForm({ ...newForm, status: e.target.value as any })}
                >
                  <option value="pago">Pago / Recebido (Liquidado)</option>
                  <option value="pendente">Pendente / A Vencer</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid de KPIs Financeiros Re-calculados pelo Período */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Card 1: Saldo */}
        <div className="card card-interactive">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-muted">SALDO EM CONTA</span>
            <div className="p-2 rounded-lg bg-blue-50 text-primary">
              <Wallet size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold mb-1">
            R$ {computedMetrics.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted">
            <span>Previsão 30d:</span>
            <span className="font-bold text-primary">
              R$ {computedMetrics.previsao30dias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 2: A Receber */}
        <div className="card card-interactive">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-muted">CONTAS A RECEBER</span>
            <div className="p-2 rounded-lg bg-green-50 text-success">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold mb-1 text-success">
            R$ {computedMetrics.receberMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">
            Receitas a liquidar no período
          </div>
        </div>

        {/* Card 3: A Pagar */}
        <div className="card card-interactive">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-muted">CONTAS A PAGAR</span>
            <div className="p-2 rounded-lg bg-red-50 text-danger">
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold mb-1 text-danger">
            R$ {computedMetrics.pagarMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">
            Despesas previstas a liquidar
          </div>
        </div>

        {/* Card 4: Margem Operacional */}
        <div className="card card-interactive">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-muted">MARGEM OPERACIONAL</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold mb-1 text-purple">
            {computedMetrics.margemOperacional}%
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-purple h-full" style={{ width: `${Math.min(computedMetrics.margemOperacional * 2, 100)}%` }} />
          </div>
        </div>

        {/* Card 5: Taxa de Inadimplência */}
        <div className="card card-interactive">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-muted">INADIMPLÊNCIA</span>
            <div className="p-2 rounded-lg bg-amber-50 text-warning">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold mb-1 text-warning">
            {computedMetrics.taxaInadimplencia}%
          </div>
          <span className={`badge ${computedMetrics.taxaInadimplencia < 3 ? 'badge-success' : 'badge-warning'}`}>
            {computedMetrics.taxaInadimplencia < 3 ? 'Baixo Risco' : 'Atenção Requerida'}
          </span>
        </div>
      </div>

      {/* Widget de Contas Bancárias & Caixas Nibo */}
      {bankAccounts.length > 0 && (
        <div className="bank-widget" style={{ marginBottom: '1.5rem' }}>
          <div className="bank-widget-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="bank-icon-container">
                <Landmark size={20} />
              </div>
              <div>
                <h3 className="bank-widget-title">Contas Bancárias & Caixas Sincronizados</h3>
                <p className="bank-widget-subtitle">Saldos de abertura e conciliação bancária integrados via Nibo Open Finance</p>
              </div>
            </div>
            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
              {bankAccounts.length} Contas Conectadas
            </span>
          </div>

          <div className="bank-grid">
            {bankAccounts.map(acc => (
              <div key={acc.id} className="bank-card">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{acc.name}</span>
                    <span className="bank-tag">{acc.bankName}</span>
                  </div>
                  {acc.bankAccount && (
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                      Ag: {acc.bankAgency || '0001'} • CC: {acc.bankAccount}
                    </div>
                  )}
                </div>
                <div className="bank-card-footer">
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Saldo:</span>
                  <span className="bank-balance">
                    R$ {acc.openBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção Principal: Gráfico e Indicadores laterais */}
      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {/* Gráfico de Área Avançado */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
            <div>
              <h3 className="font-bold text-lg">Evolução do Fluxo de Caixa</h3>
              <p className="text-xs text-muted">Exibindo período: <strong>{periodDescription}</strong></p>
            </div>

            <div className="tabs-container">
              <button 
                type="button"
                className={`tab-btn ${chartView === 'all' ? 'active' : ''}`}
                onClick={() => setChartView('all')}
              >
                Visão Completa
              </button>
              <button 
                type="button"
                className={`tab-btn ${chartView === 'lucro' ? 'active' : ''}`}
                onClick={() => setChartView('lucro')}
              >
                Lucro Líquido
              </button>
            </div>
          </div>

          <div style={{ height: '320px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayCashFlow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `R$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-lg)' }}
                  formatter={(value: any) => [`R$ ${Number(value || 0).toLocaleString('pt-BR')}`, '']}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px' }} />
                
                {chartView === 'all' && (
                  <>
                    <Area type="monotone" dataKey="receitas" name="Receitas (+)" stroke="var(--secondary)" strokeWidth={3} fillOpacity={1} fill="url(#colorReceitas)" />
                    <Area type="monotone" dataKey="despesas" name="Despesas (-)" stroke="var(--danger)" strokeWidth={3} fillOpacity={1} fill="url(#colorDespesas)" />
                  </>
                )}
                
                <Area type="monotone" dataKey="lucro" name="Lucro Líquido" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorLucro)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resumo Financeiro da Empresa */}
        <div className="card flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg mb-1">Saúde Financeira</h3>
            <p className="text-xs text-muted mb-6">Diagnóstico sintético gerado via Nibo API</p>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-xs font-semibold text-muted">ÍNDICE DE LIQUIDEZ</div>
                  <div className="text-base font-bold text-primary mt-0.5">2.28 (Excelente)</div>
                </div>
                <span className="badge badge-success">Saudável</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-xs font-semibold text-muted">RUNWAY ESTIMADO</div>
                  <div className="text-base font-bold text-primary mt-0.5">8.4 Meses</div>
                </div>
                <span className="badge badge-primary">Sustentável</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-xs font-semibold text-muted">PONTO DE EQUILÍBRIO</div>
                  <div className="text-base font-bold text-primary mt-0.5">
                    R$ {(computedMetrics.pagarMes * 1.15).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <span className="badge badge-purple">Alcançado</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-muted">
            <span>Última sincronização: <strong>Hoje às 23:48</strong></span>
            <button type="button" className="text-primary hover:underline font-semibold">Atualizar</button>
          </div>
        </div>
      </div>

      {/* Tabela de Lançamentos Recentes do Cliente */}
      <div className="card">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div>
            <h3 className="font-bold text-lg">Lançamentos do Período</h3>
            <p className="text-xs text-muted">
              Mostrando {filteredTransactions.length} registros para o filtro: <strong className="text-primary">{periodFilterSummary}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-outline text-xs" onClick={() => setIsModalOpen(true)}>
              + Adicionar Lançamento
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Descrição / Categoria</th>
                <th>Cliente / Fornecedor</th>
                <th>Data</th>
                <th>Status</th>
                <th className="text-right">Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted p-8">
                    Nenhum lançamento encontrado no período selecionado.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => {
                  let badgeClass = 'badge-warning';
                  let statusLabel = 'Pendente';
                  if (t.status === 'pago') {
                    badgeClass = 'badge-success';
                    statusLabel = 'Pago';
                  } else if (t.status === 'atrasado') {
                    badgeClass = 'badge-danger';
                    statusLabel = 'Atrasado';
                  }

                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="font-semibold text-sm">{t.description}</div>
                        <span className="badge badge-primary text-xs mt-1" style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                          {t.category}
                        </span>
                      </td>
                      <td className="text-secondary font-medium text-sm">
                        {t.clientSupplier}
                      </td>
                      <td className="text-muted text-sm font-medium">
                        {t.date}
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="text-right font-bold text-sm">
                        <span className={t.type === 'receita' ? 'text-success' : 'text-danger'}>
                          {t.type === 'receita' ? '+ ' : '- '}
                          R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
