'use client';

import { useEffect, useState } from 'react';
import { useCompany } from '@/context/CompanyContext';
import {
  getDREData,
  getFinancialHealthAnalysis,
  getCashFlowData,
  DREData,
  FinancialHealthAnalysis,
  DetailedCashFlowData
} from '@/lib/api/niboClient';
import { EbitdaEvolutionChart } from '@/components/charts/EbitdaEvolutionChart';
import { CashFlowBarChart } from '@/components/charts/CashFlowBarChart';
import { DreWaterfallChart, WaterfallView } from '@/components/charts/DreWaterfallChart';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { PeriodFilterTabs } from '@/components/ui/PeriodFilterTabs';
import {
  Printer,
  PieChart as PieIcon,
  FileSpreadsheet,
  Info,
  Calendar as CalendarIcon,
  Activity,
  Percent,
  ArrowUpRight,
  CheckCircle2,
  Receipt,
  ShieldCheck,
  Landmark
} from 'lucide-react';
import type { ComponentType } from 'react';

function getDefaultSelectedMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthRange(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number);
  const startDate = `${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getPeriodDescription(period: string, startDate?: string, endDate?: string, selectedMonth?: string) {
  if (period === '2026-m') return 'Mês Atual';
  if (period === 'month-specific') return formatMonthLabel(selectedMonth || getDefaultSelectedMonth());
  if (period === '2026-q') return 'Trimestre';
  if (period === 'custom') return `Personalizado (${startDate} a ${endDate})`;
  return `Ano ${new Date().getFullYear()}`;
}

function getDefaultCustomRange() {
  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  return { startDate, endDate };
}

// Períodos curtos (dias/semanas) só servem para ler liquidez imediata — EBITDA
// e margens exigem um ciclo mensal completo para significar algo. Por isso um
// recorte Personalizado com menos de 1 mês troca o gráfico de EBITDA por
// Movimentação de Caixa automaticamente, sem o usuário precisar pedir.
function isShortRange(period: string, startDate: string, endDate: string): boolean {
  if (period !== 'custom') return false;
  const diffDays = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000;
  return diffDays < 30;
}

// Um mês fechado (atual ou específico) não tem "evolução" própria para
// desenhar em linha do tempo — só faz sentido mostrar o resultado consolidado
// daquele mês em destaque, não uma quebra semanal disfarçada de série temporal.
function isWholeMonth(period: string): boolean {
  return period === '2026-m' || period === 'month-specific';
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
  const [cashFlow, setCashFlow] = useState<DetailedCashFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('2026-ytd');
  const [searchTerm, setSearchTerm] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [waterfallView, setWaterfallView] = useState<WaterfallView>('bpo');
  const [{ startDate, endDate }, setCustomRange] = useState(getDefaultCustomRange);
  const [selectedMonth, setSelectedMonth] = useState(getDefaultSelectedMonth);
  const showCashFlowInsteadOfEbitda = isShortRange(period, startDate, endDate);
  const showMonthHighlightInsteadOfEbitda = isWholeMonth(period);

  // "Mês Específico" é só uma forma de UI de escolher um recorte 'custom' —
  // reaproveita o mesmo filtro de intervalo de datas que já existe, sem exigir
  // um novo tipo de período no cliente da API.
  const effectiveApiPeriod = period === 'month-specific' ? 'custom' : period;
  const { startDate: effectiveStart, endDate: effectiveEnd } = period === 'month-specific'
    ? getMonthRange(selectedMonth)
    : { startDate, endDate };

  useEffect(() => {
    async function loadDRE() {
      setLoading(true);
      setError(null);
      try {
        const [dreData, healthData, cashFlowData] = await Promise.all([
          getDREData(selectedCompany.id, effectiveApiPeriod, effectiveStart, effectiveEnd),
          getFinancialHealthAnalysis(selectedCompany.id, effectiveApiPeriod, effectiveStart, effectiveEnd),
          isShortRange(period, startDate, endDate) ? getCashFlowData(selectedCompany.id) : Promise.resolve(null)
        ]);
        setDre(dreData);
        setHealth(healthData);
        setCashFlow(cashFlowData);
      } catch (err) {
        setDre(null);
        setHealth(null);
        setCashFlow(null);
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar o Nibo.');
      } finally {
        setLoading(false);
      }
    }
    loadDRE();
  }, [selectedCompany.id, period, startDate, endDate, effectiveApiPeriod, effectiveStart, effectiveEnd, retryCount]);

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
        period: `DRE Analítico Harlani Gestão (${getPeriodDescription(period, startDate, endDate, selectedMonth)})`
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
          <PeriodFilterTabs
            options={[
              { value: '2026-m', label: 'Mês Atual' },
              { value: 'month-specific', label: 'Mês Específico' },
              { value: '2026-q', label: 'Trimestre' },
              { value: '2026-ytd', label: `Ano ${new Date().getFullYear()}` },
              { value: 'custom', label: 'Personalizado' }
            ]}
            value={period}
            onChange={(v) => setPeriod(v)}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(v) => setCustomRange({ startDate: v, endDate })}
            onEndDateChange={(v) => setCustomRange({ startDate, endDate: v })}
          />

          {period === 'month-specific' && (
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 px-3 rounded-lg border border-gray-200 animate-fade-in">
              <CalendarIcon size={16} className="text-primary" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs border-none bg-transparent font-semibold outline-none cursor-pointer"
              />
            </div>
          )}

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
        {showCashFlowInsteadOfEbitda ? (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-base">Movimentação de Caixa (Realizado)</h3>
                <p className="text-xs text-muted">Entradas e saídas diárias no período selecionado</p>
              </div>
              <span className="badge badge-success">Liquidez Imediata</span>
            </div>
            <CashFlowBarChart
              data={(cashFlow?.daily ?? []).filter(d => d.date >= startDate && d.date <= endDate)}
              height={240}
            />
          </div>
        ) : showMonthHighlightInsteadOfEbitda ? (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-base">EBITDA do Mês Fechado</h3>
                <p className="text-xs text-muted">
                  Um único mês não tem evolução própria — aqui está o resultado consolidado do período
                </p>
              </div>
              <span className="badge badge-purple">
                {period === '2026-m' ? 'Mês Atual' : formatMonthLabel(selectedMonth)}
              </span>
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginTop: '0.5rem' }}>
              {([
                {
                  label: 'EBITDA',
                  value: `R$ ${dre.ebitda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  icon: Activity,
                  tone: dre.ebitda >= 0 ? 'purple' : 'danger'
                },
                {
                  label: 'MARGEM EBITDA',
                  value: `${health.margemEbitda.toFixed(1)}%`,
                  icon: Percent,
                  tone: health.margemEbitda >= 0 ? 'purple' : 'danger'
                },
                {
                  label: 'RECEITA LÍQUIDA',
                  value: `R$ ${dre.receitaLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  icon: ArrowUpRight,
                  tone: 'primary'
                },
                {
                  label: 'LUCRO LÍQUIDO',
                  value: `R$ ${dre.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  icon: CheckCircle2,
                  tone: dre.lucroLiquido >= 0 ? 'success' : 'danger'
                }
              ] as { label: string; value: string; icon: ComponentType<{ size?: number; className?: string }>; tone: 'purple' | 'danger' | 'primary' | 'success' }[]).map(tile => {
                const Icon = tile.icon;
                const toneClass = `text-${tile.tone}`;
                const toneBgVar = tile.tone === 'success' ? '--secondary-light' : `--${tile.tone}-light`;
                const toneBg = `var(${toneBgVar})`;
                return (
                  <div key={tile.label} className="card" style={{ padding: '1rem' }}>
                    <div className="flex justify-between items-start" style={{ marginBottom: '0.75rem' }}>
                      <span className="text-xs font-semibold text-muted">{tile.label}</span>
                      <div style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', backgroundColor: toneBg, lineHeight: 0 }}>
                        <Icon size={14} className={toneClass} />
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${toneClass}`}>{tile.value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
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
        )}

        {/* Resumo da Análise de DRE */}
        <div className="report-card report-card-purple">
          <div>
            <div className="report-title">
              <Info size={18} className="report-icon" />
              <span>Diagnóstico de Eficiência — {selectedCompany.name}</span>
            </div>

            <p className="report-body" style={{ marginBottom: '1.25rem' }}>
              A empresa <strong className="neutral">{selectedCompany.name}</strong> opera com uma margem EBITDA de <strong className="report-value">{health.margemEbitda.toFixed(1)}%</strong> e margem líquida de <strong className="report-value">{dre.margemLiquida.toFixed(1)}%</strong>.
            </p>

            <div className="flex flex-col gap-2">
              {([
                {
                  label: 'Despesas Fixas Mensais:',
                  value: `R$ ${health.breakEven.fixedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  icon: Receipt,
                  tone: 'neutral'
                },
                {
                  label: 'Margem de Segurança (Break-Even):',
                  value: `${health.breakEven.safetyMarginPercent >= 0 ? '+' : ''}${health.breakEven.safetyMarginPercent.toFixed(1)}% acima da meta`,
                  icon: ShieldCheck,
                  tone: health.breakEven.safetyMarginPercent >= 0 ? 'success' : 'danger'
                },
                {
                  label: 'Juros e Tarifas Financeiras:',
                  value: `R$ ${health.jurosFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  icon: Landmark,
                  tone: 'danger'
                }
              ] as { label: string; value: string; icon: ComponentType<{ size?: number; className?: string }>; tone: 'neutral' | 'success' | 'danger' }[]).map(row => {
                const Icon = row.icon;
                const textClass = row.tone === 'neutral' ? 'text-secondary' : row.tone === 'success' ? 'text-success' : 'text-danger';
                const iconClass = row.tone === 'neutral' ? 'text-primary' : textClass;
                const iconBg = row.tone === 'neutral' ? 'var(--primary-light)' : row.tone === 'success' ? 'var(--secondary-light)' : 'var(--danger-light)';
                return (
                  <div
                    key={row.label}
                    className="flex items-center gap-3"
                    style={{ padding: '0.625rem', borderRadius: 'var(--radius-md)', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                  >
                    <div style={{ padding: '0.375rem', borderRadius: 'var(--radius-md)', backgroundColor: iconBg, lineHeight: 0, flexShrink: 0 }}>
                      <Icon size={14} className={iconClass} />
                    </div>
                    <span className="text-xs text-muted flex-1">{row.label}</span>
                    <span className={`text-xs font-semibold ${textClass}`}>{row.value}</span>
                  </div>
                );
              })}
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
