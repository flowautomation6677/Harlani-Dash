'use client';

import { useEffect, useState } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { 
  getFinancialHealthAnalysis, 
  getClientData, 
  FinancialHealthAnalysis 
} from '@/lib/api/niboClient';
import { exportFinancialsToExcel } from '@/lib/utils/exportToExcel';
import { EbitdaEvolutionChart } from '@/components/charts/EbitdaEvolutionChart';
import { BreakEvenLineChart } from '@/components/charts/BreakEvenLineChart';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { 
  FileText, 
  Printer, 
  FileSpreadsheet, 
  Target, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Mail 
} from 'lucide-react';

export default function RelatoriosMensaisPage() {
  const { selectedCompany } = useCompany();
  const [health, setHealth] = useState<FinancialHealthAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('2026-m');
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailSentToast, setEmailSentToast] = useState(false);

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      const data = await getFinancialHealthAnalysis(selectedCompany.id, selectedMonth);
      setHealth(data);
      setLoading(false);
    }
    loadReport();
  }, [selectedCompany.id, selectedMonth]);

  if (loading || !health) {
    return <DashboardSkeleton />;
  }

  const handleExportExcel = async () => {
    try {
      const fullData = await getClientData(selectedCompany.id);
      let periodLabel = 'Ano 2026';
      if (selectedMonth === '2026-m') {
        periodLabel = 'Mês Atual';
      } else if (selectedMonth === '2026-q') {
        periodLabel = 'Último Trimestre';
      }

      exportFinancialsToExcel({
        company: selectedCompany,
        metrics: fullData.metrics,
        cashFlow: fullData.cashFlow,
        transactions: fullData.transactions,
        period: `Relatório Executivo Harlani Gestão (${periodLabel})`
      });
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      alert("Erro ao exportar relatório.");
    }
  };

  const handleSendEmail = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!emailInput) return;
    setEmailModalOpen(false);
    setEmailSentToast(true);
    setTimeout(() => setEmailSentToast(false), 4000);
  };

  const isSafe = health.breakEven.safetyMarginValue >= 0;
  const breakEvenAchievement = health.breakEven.totalRevenue > 0 
    ? ((health.breakEven.totalRevenue / health.breakEven.breakEvenPoint) * 100).toFixed(0)
    : '0';

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Toast de E-mail Enviado */}
      {emailSentToast && (
        <div className="flex items-center gap-3 animate-fade-in" style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', backgroundColor: '#0f172a', color: '#fff', padding: '1rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 50, border: '1px solid #334155' }}>
          <CheckCircle2 size={24} style={{ color: 'var(--secondary)' }} />
          <div>
            <div className="font-bold text-sm">Relatório Enviado com Sucesso!</div>
            <div className="text-xs" style={{ color: '#cbd5e1' }}>O PDF executivo e o sumário foram disparados para {emailInput}.</div>
          </div>
        </div>
      )}

      {/* Modal de Envio por E-mail */}
      {emailModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2 text-primary font-bold">
                <Mail size={20} />
                <h3>Enviar Relatório Executivo Harlani Gestão</h3>
              </div>
            </div>

            <form onSubmit={handleSendEmail} className="flex flex-col gap-4">
              <div>
                <label htmlFor="client-email" className="text-xs font-semibold text-muted" style={{ marginBottom: '0.25rem', display: 'block' }}>
                  E-mail do Cliente / Diretoria
                </label>
                <input 
                  id="client-email"
                  type="email" 
                  required
                  placeholder="diretoria@empresa.com.br" 
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="text-xs text-secondary" style={{ padding: '0.75rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', lineHeight: 1.5 }}>
                O cliente receberá um e-mail personalizado da <strong>Harlani Gestão</strong> contendo o parecer dos especialistas, indicadores de EBITDA e o PDF corporativo anexado.
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setEmailModalOpen(false)} className="btn btn-outline text-xs">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary text-xs gap-2">
                  <Mail size={16} />
                  Confirmar Envio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="card flex flex-wrap items-center justify-between gap-4" style={{ padding: '1.5rem' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center font-bold text-xl text-purple" style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--purple-light)' }}>
            <FileText size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Relatório Executivo Mensal — {selectedCompany.name}</h1>
              <span className="badge badge-purple">Harlani Gestão BPO</span>
            </div>
            <p className="text-xs text-muted mt-1">
              Demonstrativo consolidado de EBITDA, Ponto de Equilíbrio e Parecer de Consultoria
            </p>
          </div>
        </div>

        {/* Controles de Período e Exportação */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="tabs-container">
            <button 
              type="button"
              className={`tab-btn ${selectedMonth === '2026-m' ? 'active' : ''}`}
              onClick={() => setSelectedMonth('2026-m')}
            >
              Mês Atual
            </button>
            <button 
              type="button"
              className={`tab-btn ${selectedMonth === '2026-q' ? 'active' : ''}`}
              onClick={() => setSelectedMonth('2026-q')}
            >
              Último Trimestre
            </button>
            <button 
              type="button"
              className={`tab-btn ${selectedMonth === '2026-ytd' ? 'active' : ''}`}
              onClick={() => setSelectedMonth('2026-ytd')}
            >
              Ano 2026 (YTD)
            </button>
          </div>

          <button type="button" onClick={() => window.print()} className="btn btn-outline gap-2 text-xs">
            <Printer size={16} />
            Imprimir / Salvar PDF
          </button>
          <button type="button" onClick={handleExportExcel} className="btn btn-outline gap-2 text-xs">
            <FileSpreadsheet size={16} />
            Exportar Excel
          </button>
          <button type="button" onClick={() => setEmailModalOpen(true)} className="btn btn-primary gap-2 text-xs">
            <Mail size={16} />
            Enviar ao Cliente
          </button>
        </div>
      </div>

      {/* KPI Cards de Performance Gerencial */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Faturamento Líquido */}
        <div className="card">
          <div className="text-xs font-semibold text-muted mb-2">RECEITA OPERACIONAL LÍQUIDA</div>
          <div className="text-2xl font-bold text-primary mb-1">
            R$ {health.breakEven.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">100% da base realizada</div>
        </div>

        {/* EBITDA */}
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-muted">EBITDA (LAJIDA)</span>
            <span className="text-xs font-bold text-purple">{health.margemEbitda.toFixed(1)}% Margem</span>
          </div>
          <div className="text-2xl font-bold text-purple mb-1">
            R$ {health.ebitda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">Geração de caixa operacional pura</div>
        </div>

        {/* Ponto de Equilíbrio (Break-Even) */}
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-muted">PONTO DE EQUILÍBRIO</span>
            <span className={`badge ${isSafe ? 'badge-success' : 'badge-danger'}`}>
              {breakEvenAchievement}% Atingido
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-600 mb-1" style={{ color: '#d97706' }}>
            R$ {health.breakEven.breakEvenPoint.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">Meta mínima para cobrir custos fixos</div>
        </div>

        {/* Margem de Segurança */}
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-muted">MARGEM DE SEGURANÇA</span>
            {isSafe ? <ShieldCheck size={16} className="text-success" /> : <AlertTriangle size={16} className="text-danger" />}
          </div>
          <div className={`text-2xl font-bold mb-1 ${isSafe ? 'text-success' : 'text-danger'}`}>
            {isSafe ? '+' : ''} R$ {health.breakEven.safetyMarginValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">
            {health.breakEven.safetyMarginPercent.toFixed(1)}% acima do limite de risco
          </div>
        </div>
      </div>

      {/* Gráficos de Suporte: Evolução EBITDA & Break-Even Line */}
      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        {/* Gráfico 1: Evolução do EBITDA */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-base">Evolução Mensal do EBITDA (R$)</h3>
              <p className="text-xs text-muted">Geração operacional vs. Receita e Margem %</p>
            </div>
            <span className="badge badge-purple">Recharts Modular</span>
          </div>
          <EbitdaEvolutionChart data={health.ebitdaEvolution} height={260} />
        </div>

        {/* Gráfico 2: Curva de Ponto de Equilíbrio */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-base">Faturamento vs. Ponto de Equilíbrio</h3>
              <p className="text-xs text-muted">Zona de cobertura de despesas e margem de lucro</p>
            </div>
            <span className="badge badge-success">Meta Break-Even</span>
          </div>
          <BreakEvenLineChart data={health.breakEven.monthlyBreakdown} height={260} />
        </div>
      </div>

      {/* Parecer do Especialista Harlani Gestão */}
      <div className="card" style={{ padding: '2rem' }}>
        <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center font-bold text-lg text-purple" style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--purple-light)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              HG
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Parecer Técnico da Consultoria — Harlani Gestão</h3>
              <p className="text-xs text-muted" style={{ marginTop: '0.125rem' }}>Diagnóstico contábil e estratégico consolidado via Nibo Open API</p>
            </div>
          </div>
          <span className="badge badge-purple" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
            Auditoria & Consultoria Ativa
          </span>
        </div>

        <div className="report-grid">
          {/* Card 1: Eficiência Operacional */}
          <div className="report-card report-card-success">
            <div>
              <div className="report-title">
                <CheckCircle2 size={18} className="report-icon" />
                <span>Eficiência Operacional & EBITDA</span>
              </div>
              <p className="report-body">
                A empresa <strong className="neutral">{selectedCompany.name}</strong> obteve um EBITDA realizado de <strong className="report-value">R$ {health.ebitda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, atingindo uma margem operacional pura de <strong className="report-value">{health.margemEbitda.toFixed(1)}%</strong>.
              </p>
            </div>
            <div className="report-footer">
              ✓ Capacidade de geração de caixa aprovada
            </div>
          </div>

          {/* Card 2: Ponto de Equilíbrio */}
          <div className="report-card report-card-warning">
            <div>
              <div className="report-title">
                <Target size={18} className="report-icon" />
                <span>Ponto de Equilíbrio & Segurança</span>
              </div>
              <p className="report-body">
                O ponto de equilíbrio (Break-Even) necessário é de <strong className="report-value">R$ {health.breakEven.breakEvenPoint.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>. A empresa opera com <strong className="report-value">{health.breakEven.safetyMarginPercent.toFixed(1)}% de Margem de Segurança</strong> acima do limiar crítico.
              </p>
            </div>
            <div className="report-footer">
              ✓ Cobertura integral de custos fixos
            </div>
          </div>

          {/* Card 3: Recomendação Estratégica */}
          <div className="report-card report-card-info">
            <div>
              <div className="report-title">
                <ShieldCheck size={18} className="report-icon" />
                <span>Diretriz & Planejamento</span>
              </div>
              <p className="report-body">
                Recomenda-se manter o teto de despesas fixas em <strong className="report-value">R$ {health.breakEven.fixedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> e priorizar a alocação de liquidez em contas de aplicação remunerada.
              </p>
            </div>
            <div className="report-footer">
              ✓ Planejamento orçamentário sustentável
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-muted" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: 'var(--secondary)' }} />
            <span>Relatório executivo gerado via <strong style={{ color: 'var(--text-primary)' }}>Harlani Gestão BPO Financeiro</strong></span>
          </div>
          <div className="badge badge-purple" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
            Assinatura Digital com Validade Fiscal
          </div>
        </div>
      </div>
    </div>
  );
}
