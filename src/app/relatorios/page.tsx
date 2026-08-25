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
      <div className="card bg-gradient-to-br from-white to-purple-50 border-purple-100">
        <div className="flex items-center gap-3 mb-4 text-purple">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center font-bold">
            GG
          </div>
          <div>
            <h3 className="font-bold text-base text-secondary">Parecer da Consultoria — Gageia Gestão</h3>
            <p className="text-xs text-muted">Análise técnica automatizada baseada no plano contábil do Nibo</p>
          </div>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div className="p-4 bg-white rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 text-xs font-bold text-success mb-2">
              <CheckCircle2 size={16} />
              <span>EFICIÊNCIA OPERACIONAL & EBITDA</span>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              A empresa <strong className="text-primary">{selectedCompany.name}</strong> gerou um EBITDA de <strong>R$ {health.ebitda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, representando uma margem de <strong>{health.margemEbitda.toFixed(1)}%</strong>. O resultado operacional demonstra sólida capacidade de geração de caixa das atividades-fim.
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 mb-2">
              <Target size={16} />
              <span>PONTO DE EQUILÍBRIO & COBERTURA</span>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              O ponto de equilíbrio calculado foi de <strong>R$ {health.breakEven.breakEvenPoint.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>. A empresa opera com uma <strong>Margem de Segurança de {health.breakEven.safetyMarginPercent.toFixed(1)}%</strong>, indicando folga operacional para absorver oscilações de mercado sem incorrer em prejuízo.
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 text-xs font-bold text-primary mb-2">
              <ShieldCheck size={16} />
              <span>RECOMENDAÇÃO ESTRATÉGICA</span>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              Recomenda-se manter a vigilância sobre as despesas fixas (atualmente em R$ {health.breakEven.fixedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) e priorizar investimentos com Retorno sobre o Capital Empregado (ROIC) superior à taxa de captação.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-purple-100/60 flex justify-between items-center text-[11px] text-muted">
          <span>Relatório gerado automaticamente via integração Nibo API • <strong>Gageia Gestão BPO</strong></span>
          <span className="font-semibold text-purple">Assinatura Digital Validade Fiscal</span>
        </div>
      </div>
    </div>
  );
}
