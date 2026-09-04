'use client';

import { useEffect, useState } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { 
  getDREData, 
  getFinancialHealthAnalysis, 
  DREData, 
  FinancialHealthAnalysis 
} from '@/lib/api/niboClient';
import { EbitdaEvolutionChart } from '@/components/charts/EbitdaEvolutionChart';
import { DreWaterfallChart, WaterfallView } from '@/components/charts/DreWaterfallChart';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { 
  Printer, 
  PieChart as PieIcon, 
  FileSpreadsheet,
  Info
} from 'lucide-react';

function getPeriodDescription(period: string) {
  if (period === '2026-m') return 'Mês Atual';
  if (period === '2026-q') return 'Último Trimestre';
  return 'Ano YTD';
}

function getItemRowStyle(item: { type: string; isBold?: boolean }) {
  if (item.type === 'lucro') {
    return { className: 'bg-emerald-50 font-bold', style: { backgroundColor: 'rgba(16, 185, 129, 0.08)', fontWeight: 'bold' } };
  }
  if (item.type === 'subtotal') {
    return { className: 'bg-blue-50 font-bold', style: { backgroundColor: 'rgba(59, 130, 246, 0.06)', fontWeight: 'bold' } };
  }
  if (item.isBold) {
    return { className: 'bg-gray-50 font-bold', style: { backgroundColor: '#f8fafc', fontWeight: '600' } };
  }
  return { className: '', style: {} };
}

function getItemValueDisplay(item: { value: number; type: string }) {
  const formatted = Math.abs(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  if (item.value < 0) {
    return {
      text: `(${formatted})`,
      className: 'text-danger font-medium'
    };
  }
  const isHighlight = item.type === 'lucro' || item.type === 'subtotal';
  return {
    text: item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    className: isHighlight ? 'text-primary font-bold' : 'font-semibold'
  };
}

export default function DREPage() {
  const { selectedCompany } = useCompany();
  const [dre, setDre] = useState<DREData | null>(null);
  const [health, setHealth] = useState<FinancialHealthAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('2026-ytd');
  const [searchTerm, setSearchTerm] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [waterfallView, setWaterfallView] = useState<WaterfallView>('bpo');

  useEffect(() => {
    async function loadDRE() {
      setLoading(true);
      setError(null);
      try {
        const [dreData, healthData] = await Promise.all([
          getDREData(selectedCompany.id, period),
          getFinancialHealthAnalysis(selectedCompany.id, period)
        ]);
        setDre(dreData);
        setHealth(healthData);
      } catch (err) {
        setDre(null);
        setHealth(null);
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar o Nibo.');
      } finally {
        setLoading(false);
      }
    }
    loadDRE();
  }, [selectedCompany.id, period, retryCount]);

  const handleExport = async () => {
    try {
      const { getClientData } = await import('@/lib/api/niboClient');
      const { exportFinancialsToExcel } = await import('@/lib/utils/exportToExcel');
      
      const fullData = await getClientData(selectedCompany.id);
      
      exportFinancialsToExcel({
        company: selectedCompany,
        metrics: fullData.metrics,
        cashFlow: fullData.cashFlow,
        transactions: fullData.transactions,
        period: `DRE Analítico Harlani Gestão (${getPeriodDescription(period)})`
      });
    } catch (e) {
      console.error("Erro ao exportar o DRE:", e);
      alert("Erro ao exportar o DRE.");
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !dre || !health) {
    return <ErrorState message={error ?? undefined} onRetry={() => setRetryCount(c => c + 1)} />;
  }

  const filteredItems = dre.items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.code.includes(searchTerm)
  );

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple font-bold text-xl">
            <PieIcon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">DRE Gerencial — {selectedCompany.name}</h1>
              <span className="badge badge-purple">Regime de Competência</span>
            </div>
            <p className="text-xs text-muted mt-1">
              Demonstrativo do Resultado do Exercício sincronizado com a API Nibo
            </p>
          </div>
        </div>

        {/* Controles de Período e Exportação */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="tabs-container">
            <button 
              type="button"
              className={`tab-btn ${period === '2026-m' ? 'active' : ''}`}
              onClick={() => setPeriod('2026-m')}
            >
              Mês Atual
            </button>
            <button 
              type="button"
              className={`tab-btn ${period === '2026-q' ? 'active' : ''}`}
              onClick={() => setPeriod('2026-q')}
            >
              Último Trimestre
            </button>
            <button 
              type="button"
              className={`tab-btn ${period === '2026-ytd' ? 'active' : ''}`}
              onClick={() => setPeriod('2026-ytd')}
            >
              Ano 2026 (YTD)
            </button>
          </div>

          <button type="button" className="btn btn-outline gap-2 text-xs" onClick={() => window.print()}>
            <Printer size={16} />
            Imprimir
          </button>
          <button type="button" onClick={handleExport} className="btn btn-primary gap-2 text-xs">
            <FileSpreadsheet size={16} />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Ponte de Resultado (Waterfall): substitui os tiles soltos por uma cascata
          que mostra como a Receita Bruta vira Lucro Líquido, passo a passo. */}
      <div className="card">
        <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
          <div>
            <h3 className="font-bold text-lg">Ponte de Resultado — da Receita ao Lucro</h3>
            <p className="text-xs text-muted">
              {waterfallView === 'bpo'
                ? 'Detalhamento completo: deduções, custos, despesas e resultado financeiro'
                : 'Visão resumida para o cliente: receita, custos totais e lucro'}
            </p>
          </div>

          <div className="tabs-container">
            <button
              type="button"
              className={`tab-btn ${waterfallView === 'bpo' ? 'active' : ''}`}
              onClick={() => setWaterfallView('bpo')}
            >
              Visão BPO
            </button>
            <button
              type="button"
              className={`tab-btn ${waterfallView === 'cliente' ? 'active' : ''}`}
              onClick={() => setWaterfallView('cliente')}
            >
              Visão Cliente
            </button>
          </div>
        </div>

        <DreWaterfallChart dre={dre} view={waterfallView} height={360} />
      </div>

      {/* Gráficos: Evolução do EBITDA e Estrutura de DRE */}
      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-base">Evolução Mensal do EBITDA</h3>
              <p className="text-xs text-muted">Geração de caixa operacional ao longo do ano</p>
            </div>
            <span className="badge badge-purple">Harlani Gestão</span>
          </div>
          <EbitdaEvolutionChart data={health.ebitdaEvolution} height={240} />
        </div>

        {/* Resumo da Análise de DRE */}
        <div className="report-card report-card-purple">
          <div>
            <div className="report-title">
              <Info size={18} className="report-icon" />
              <span>Diagnóstico de Eficiência — Harlani Gestão</span>
            </div>

            <p className="report-body" style={{ marginBottom: '1.25rem' }}>
              A empresa <strong className="neutral">{selectedCompany.name}</strong> opera com uma margem EBITDA de <strong className="report-value">{health.margemEbitda.toFixed(1)}%</strong> e margem líquida de <strong className="report-value">{dre.margemLiquida.toFixed(1)}%</strong>.
            </p>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs p-2 rounded" style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <span className="text-muted">Despesas Fixas Mensais:</span>
                <span className="font-semibold text-secondary">R$ {health.breakEven.fixedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between items-center text-xs p-2 rounded" style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <span className="text-muted">Margem de Segurança (Break-Even):</span>
                <span className="font-semibold text-success">+{health.breakEven.safetyMarginPercent.toFixed(1)}% acima da meta</span>
              </div>

              <div className="flex justify-between items-center text-xs p-2 rounded" style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <span className="text-muted">Juros e Tarifas Financeiras:</span>
                <span className="font-semibold text-danger">R$ {health.jurosFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="report-footer">
            * Dados calculados a partir dos planos de contas do Nibo via Harlani Gestão.
          </div>
        </div>
      </div>

      {/* Tabela Estruturada do DRE */}
      <div className="card">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div>
            <h3 className="font-bold text-lg">Detalhamento do DRE Analítico</h3>
            <p className="text-xs text-muted">Contas organizadas conforme plano de contas padrão contábil</p>
          </div>

          <div className="custom-select-container" style={{ padding: '0.4rem 0.75rem' }}>
            <input 
              type="text" 
              placeholder="Filtrar conta contábil..." 
              className="custom-select" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '220px' }}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Código</th>
                <th>Descrição da Conta</th>
                <th className="text-right">Valor (R$)</th>
                <th className="text-right">% Vertical</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const rowStyle = getItemRowStyle(item);
                const valueDisplay = getItemValueDisplay(item);

                return (
                  <tr 
                    key={item.id} 
                    className={rowStyle.className}
                    style={rowStyle.style}
                  >
                    <td className="text-muted text-xs font-mono">{item.code}</td>
                    <td>
                      <div className={`text-sm ${item.isBold ? 'font-bold' : 'font-normal text-secondary'}`}>
                        {item.name}
                      </div>
                    </td>
                    <td className="text-right text-sm">
                      <span className={valueDisplay.className}>
                        {valueDisplay.text}
                      </span>
                    </td>
                    <td className="text-right text-sm font-mono">
                      <span className={item.percentage < 0 ? 'text-danger' : 'text-secondary'}>
                        {item.percentage > 0 ? `+${item.percentage.toFixed(1)}%` : `${item.percentage.toFixed(1)}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
