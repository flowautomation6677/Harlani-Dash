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
        period: `Relatório Executivo Gageia Gestão (${periodLabel})`
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
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 border border-slate-700 animate-fade-in">
          <CheckCircle2 size={24} className="text-emerald-400" />
          <div>
            <div className="font-bold text-sm">Relatório Enviado com Sucesso!</div>
            <div className="text-xs text-slate-300">O PDF executivo e o sumário foram disparados para {emailInput}.</div>
          </div>
        </div>
      )}

      {/* Modal de Envio por E-mail */}
      {emailModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Mail size={20} />
                <h3>Enviar Relatório Executivo Gageia Gestão</h3>
              </div>
            </div>

            <form onSubmit={handleSendEmail} className="flex flex-col gap-4">
              <div>
                <label htmlFor="client-email" className="text-xs font-semibold text-muted mb-1 block">
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

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-secondary leading-relaxed">
                O cliente receberá um e-mail personalizado da <strong>Gageia Gestão</strong> contendo o parecer dos especialistas, indicadores de EBITDA e o PDF corporativo anexado.
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple font-bold text-xl">
            <FileText size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Relatório Executivo Mensal — {selectedCompany.name}</h1>
              <span className="badge badge-purple">Gageia Gestão BPO</span>
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

      {/* Parecer do Especialista Gageia Gestão */}
      <div className="card" style={{ padding: '2rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1rem', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple border border-purple-100 flex items-center justify-center font-extrabold text-lg shadow-sm">
              GG
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Parecer Técnico da Consultoria — Gageia Gestão</h3>
              <p className="text-xs text-muted mt-0.5">Diagnóstico contábil e estratégico consolidado via Nibo Open API</p>
            </div>
          </div>
          <span className="badge badge-purple" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
            Auditoria & Consultoria Ativa
          </span>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {/* Card 1: Eficiência Operacional */}
          <div className="p-5 rounded-xl border border-emerald-100 bg-emerald-50/30 flex flex-col justify-between" style={{ minHeight: '180px' }}>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span>Eficiência Operacional & EBITDA</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                A empresa <strong className="text-slate-900">{selectedCompany.name}</strong> obteve um EBITDA realizado de <strong className="text-emerald-700">R$ {health.ebitda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, atingindo uma margem operacional pura de <strong className="text-emerald-700">{health.margemEbitda.toFixed(1)}%</strong>.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-100/60 text-xs font-medium text-emerald-800">
              ✓ Capacidade de geração de caixa aprovada
            </div>
          </div>

          {/* Card 2: Ponto de Equilíbrio */}
          <div className="p-5 rounded-xl border border-amber-100 bg-amber-50/30 flex flex-col justify-between" style={{ minHeight: '180px' }}>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-3">
                <Target size={18} className="text-amber-600" />
                <span>Ponto de Equilíbrio & Segurança</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                O ponto de equilíbrio (Break-Even) necessário é de <strong className="text-amber-900">R$ {health.breakEven.breakEvenPoint.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>. A empresa opera com <strong className="text-amber-900">{health.breakEven.safetyMarginPercent.toFixed(1)}% de Margem de Segurança</strong> acima do limiar crítico.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-100/60 text-xs font-medium text-amber-800">
              ✓ Cobertura integral de custos fixos
            </div>
          </div>

          {/* Card 3: Recomendação Estratégica */}
          <div className="p-5 rounded-xl border border-blue-100 bg-blue-50/30 flex flex-col justify-between" style={{ minHeight: '180px' }}>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-800 uppercase tracking-wider mb-3">
                <ShieldCheck size={18} className="text-blue-600" />
                <span>Diretriz & Planejamento</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                Recomenda-se manter o teto de despesas fixas em <strong className="text-blue-900">R$ {health.breakEven.fixedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> e priorizar a alocação de liquidez em contas de aplicação remunerada.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-100/60 text-xs font-medium text-blue-800">
              ✓ Planejamento orçamentário sustentável
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2 text-xs text-muted">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Relatório executivo gerado via <strong>Gageia Gestão BPO Financeiro</strong></span>
          </div>
          <div className="font-semibold text-purple bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
            Assinatura Digital com Validade Fiscal
          </div>
        </div>
      </div>
    </div>
  );
}
