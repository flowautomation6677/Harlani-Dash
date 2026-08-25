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
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { 
  Printer, 
  TrendingUp, 
  PieChart as PieIcon, 
  FileSpreadsheet,
  Info,
  Target,
  ShieldCheck
} from 'lucide-react';

export default function DREPage() {
  const { selectedCompany } = useCompany();
  const [dre, setDre] = useState<DREData | null>(null);
  const [health, setHealth] = useState<FinancialHealthAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('2026-ytd');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadDRE() {
      setLoading(true);
      const [dreData, healthData] = await Promise.all([
        getDREData(selectedCompany.id, period),
        getFinancialHealthAnalysis(selectedCompany.id, period)
      ]);
      setDre(dreData);
      setHealth(healthData);
      setLoading(false);
    }
    loadDRE();
  }, [selectedCompany.id, period]);

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
        period: `DRE Analítico Harlani Gestão (${period === '2026-m' ? 'Mês Atual' : period === '2026-q' ? 'Último Trimestre' : 'Ano YTD'})`
      });
    } catch (e) {
      alert("Erro ao exportar o DRE.");
    }
  };

  if (loading || !dre || !health) {
    return <DashboardSkeleton />;
  }

  const filteredItems = dre.items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.code.includes(searchTerm)
  );

  // Dados para o gráfico sintético da estrutura do DRE
  const chartData = [
    { name: 'Rec. Bruta', valor: dre.receitaBruta, color: 'var(--primary)' },
    { name: 'Deduções', valor: Math.abs(dre.impostosDeducoes), color: 'var(--warning)' },
    { name: 'Custos', valor: Math.abs(dre.custosVendas), color: '#f87171' },
    { name: 'Lucro Bruto', valor: dre.lucroBruto, color: 'var(--secondary)' },
    { name: 'Desp. Oper.', valor: Math.abs(dre.despesasOperacionais), color: '#ef4444' },
    { name: 'Lucro Líq.', valor: dre.lucroLiquido, color: 'var(--purple)' },
  ];

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
              className={`tab-btn ${period === '2026-m' ? 'active' : ''}`}
              onClick={() => setPeriod('2026-m')}
            >
              Mês Atual
            </button>
            <button 
              className={`tab-btn ${period === '2026-q' ? 'active' : ''}`}
              onClick={() => setPeriod('2026-q')}
            >
              Último Trimestre
            </button>
            <button 
              className={`tab-btn ${period === '2026-ytd' ? 'active' : ''}`}
              onClick={() => setPeriod('2026-ytd')}
            >
              Ano 2026 (YTD)
            </button>
          </div>

          <button className="btn btn-outline gap-2 text-xs" onClick={() => window.print()}>
            <Printer size={16} />
            Imprimir
          </button>
          <button onClick={handleExport} className="btn btn-primary gap-2 text-xs">
            <FileSpreadsheet size={16} />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Cards de Resumo Gerencial */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card">
          <div className="text-xs font-semibold text-muted mb-2">RECEITA LÍQUIDA</div>
          <div className="text-2xl font-bold text-primary mb-1">
            R$ {dre.receitaLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">100% das vendas deduzidas</div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-muted mb-2">LUCRO BRUTO</div>
          <div className="text-2xl font-bold text-success mb-1">
            R$ {dre.lucroBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">
            Margem: <strong>{((dre.lucroBruto / dre.receitaBruta) * 100).toFixed(1)}%</strong>
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-muted mb-2">EBITDA (LAJIDA)</div>
          <div className="text-2xl font-bold text-purple mb-1">
            R$ {health.ebitda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-xs text-purple font-semibold">
            <TrendingUp size={14} />
            <span>Margem EBITDA: {health.margemEbitda.toFixed(1)}%</span>
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-muted mb-2">PONTO DE EQUILÍBRIO</div>
          <div className="text-2xl font-bold text-amber-600 mb-1" style={{ color: '#d97706' }}>
            R$ {health.breakEven.breakEvenPoint.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">
            Folga: <strong>{health.breakEven.safetyMarginPercent.toFixed(1)}%</strong>
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-muted mb-2">LUCRO LÍQUIDO</div>
          <div className="text-2xl font-bold text-emerald-600 mb-1" style={{ color: '#059669' }}>
            R$ {dre.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">
            Margem: <strong style={{ color: '#059669' }}>{dre.margemLiquida.toFixed(1)}%</strong>
          </div>
        </div>
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
        <div className="card flex flex-col justify-between bg-gradient-to-br from-white to-purple-50">
          <div>
            <div className="flex items-center gap-2 mb-3 text-purple font-bold text-sm">
              <Info size={18} />
              <span>Diagnóstico de Eficiência — Harlani Gestão</span>
            </div>

            <p className="text-xs text-secondary leading-relaxed mb-4">
              A empresa <strong className="text-primary">{selectedCompany.name}</strong> opera com uma margem EBITDA de <strong>{health.margemEbitda.toFixed(1)}%</strong> e margem líquida de <strong>{dre.margemLiquida.toFixed(1)}%</strong>.
            </p>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs p-2 bg-white rounded border border-gray-100">
                <span className="text-muted">Despesas Fixas Mensais:</span>
                <span className="font-semibold text-secondary">R$ {health.breakEven.fixedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between items-center text-xs p-2 bg-white rounded border border-gray-100">
                <span className="text-muted">Margem de Segurança (Break-Even):</span>
                <span className="font-semibold text-success">+{health.breakEven.safetyMarginPercent.toFixed(1)}% acima da meta</span>
              </div>

              <div className="flex justify-between items-center text-xs p-2 bg-white rounded border border-gray-100">
                <span className="text-muted">Juros e Tarifas Financeiras:</span>
                <span className="font-semibold text-danger">R$ {health.jurosFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted mt-4 pt-3 border-t border-gray-100">
            * Dados calculados a partir dos planos de contas do Nibo via <strong>Harlani Gestão</strong>.
          </div>
        </div>
      </div>

      {/* Tabela Estruturada do DRE */}
      <div className="card">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div>
            <h3 className="font-bold text-lg">DRE Detalhado por Conta</h3>
            <p className="text-xs text-muted">Estrutura de contas com percentual de análise vertical</p>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Filtrar conta ou código..." 
              className="text-xs p-2 border border-gray-200 rounded-md outline-none focus:border-primary"
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
                const isSubtotal = item.type === 'subtotal';
                const isLucro = item.type === 'lucro';
                const isReceita = item.type === 'receita' && item.isBold;

                let rowStyle = '';
                if (isLucro) rowStyle = 'bg-emerald-50 font-bold';
                else if (isSubtotal) rowStyle = 'bg-blue-50 font-bold';
                else if (isReceita) rowStyle = 'bg-gray-50 font-bold';

                return (
                  <tr 
                    key={item.id} 
                    className={rowStyle}
                    style={
                      isLucro ? { backgroundColor: 'rgba(16, 185, 129, 0.08)', fontWeight: 'bold' } :
                      isSubtotal ? { backgroundColor: 'rgba(59, 130, 246, 0.06)', fontWeight: 'bold' } :
                      item.isBold ? { backgroundColor: '#f8fafc', fontWeight: '600' } : {}
                    }
                  >
                    <td className="text-muted text-xs font-mono">{item.code}</td>
                    <td>
                      <div className={`text-sm ${item.isBold ? 'font-bold' : 'font-normal text-secondary'}`}>
                        {item.name}
                      </div>
                    </td>
                    <td className="text-right text-sm">
                      <span className={
                        item.value < 0 ? 'text-danger font-medium' : 
                        isLucro || isSubtotal ? 'text-primary font-bold' : 'font-semibold'
                      }>
                        {item.value < 0 ? `(${Math.abs(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
