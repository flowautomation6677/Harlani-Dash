'use client';

import { useEffect, useState, useMemo } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { getCashFlowData, DetailedCashFlowData, parseLocalDate } from '@/lib/api/niboClient';
import { CashFlowBarChart } from '@/components/charts/CashFlowBarChart';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Plus,
  CheckCircle2,
  Clock,
  ArrowLeftRight
} from 'lucide-react';

export default function FluxoDeCaixaPage() {
  const { selectedCompany } = useCompany();
  const [dfc, setDfc] = useState<DetailedCashFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('diario');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    async function loadDFC() {
      setLoading(true);
      setError(null);
      try {
        const data = await getCashFlowData(selectedCompany.id);
        setDfc(data);
      } catch (err) {
        setDfc(null);
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar o Nibo.');
      } finally {
        setLoading(false);
      }
    }
    loadDFC();
  }, [selectedCompany.id, retryCount]);

  const filteredData = useMemo(() => {
    if (!dfc) return [];

    const nonOpByDate = new Map(dfc.nonOperationalByDay.map(d => [d.date, d.entradas - d.saidas]));

    if (period === 'diario') {
      return dfc.daily.map(item => {
        const nonOpNet = nonOpByDate.get(item.date);
        return nonOpNet === undefined
          ? item
          : { ...item, hasNonOperational: true, nonOperationalNet: nonOpNet };
      });
    }

    const grouped: Record<string, any> = {};

    dfc.daily.forEach(item => {
      const d = parseLocalDate(item.date);
      let key = '';
      let displayLabel = '';

      if (period === 'semanal') {
        const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
        displayLabel = `Semana ${weekNum} (${d.getFullYear()})`;
      } else if (period === 'mensal') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        displayLabel = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        displayLabel = displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1);
      }

      if (!grouped[key]) {
        grouped[key] = {
          date: displayLabel,
          dayName: period === 'semanal' ? 'Semana' : 'Mês',
          entradas: 0,
          saidas: 0,
          resultado: 0,
          saldoAcumulado: item.saldoAcumulado,
          status: item.status,
          hasNonOperational: false,
          nonOperationalNet: 0
        };
      }

      grouped[key].entradas += item.entradas;
      grouped[key].saidas += item.saidas;
      grouped[key].resultado += item.resultado;
      grouped[key].saldoAcumulado = item.saldoAcumulado;
      if (item.status === 'projetado') grouped[key].status = 'projetado';

      const nonOpNet = nonOpByDate.get(item.date);
      if (nonOpNet !== undefined) {
        grouped[key].hasNonOperational = true;
        grouped[key].nonOperationalNet += nonOpNet;
      }
    });

    return Object.keys(grouped).sort((a, b) => a.localeCompare(b)).map(k => grouped[k]);
  }, [dfc, period]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !dfc) {
    return <ErrorState message={error ?? undefined} onRetry={() => setRetryCount(c => c + 1)} />;
  }

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
        period: `Fluxo de Caixa Harlani Gestão (${period})`
      });
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert("Erro ao exportar o relatório.");
    }
  };

  const handleNewTransaction = () => {
    alert("Nesta versão de sincronização inteligente, os dados são puxados automaticamente do seu Nibo em tempo real (Read-Only). \n\nPara cadastrar uma nova movimentação, acesse diretamente o painel da Nibo.");
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Header com Contexto da Empresa */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-secondary font-bold text-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Fluxo de Caixa (DFC) — {selectedCompany.name}</h1>
              <span className="badge badge-success">Sincronizado Nibo</span>
            </div>
            <p className="text-xs text-muted mt-1">
              Visão consolidada de entradas, saídas operacionais e movimentações bancárias
            </p>
          </div>
        </div>

        {/* Controles e Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="tabs-container">
            <button 
              type="button"
              className={`tab-btn ${period === 'diario' ? 'active' : ''}`}
              onClick={() => setPeriod('diario')}
            >
              Diário
            </button>
            <button 
              type="button"
              className={`tab-btn ${period === 'semanal' ? 'active' : ''}`}
              onClick={() => setPeriod('semanal')}
            >
              Semanal
            </button>
            <button 
              type="button"
              className={`tab-btn ${period === 'mensal' ? 'active' : ''}`}
              onClick={() => setPeriod('mensal')}
            >
              Mensal
            </button>
          </div>

          <button type="button" onClick={handleExport} className="btn btn-outline gap-2 text-xs">
            <Download size={16} />
            Exportar DFC
          </button>
          <button type="button" onClick={handleNewTransaction} className="btn btn-primary gap-2 text-xs">
            <Plus size={16} />
            Nova Movimentação
          </button>
        </div>
      </div>

      {/* KPI Cards — Resumo do Fluxo de Caixa */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        {/* Saldo Inicial */}
        <div className="card">
          <div className="text-xs font-semibold text-muted mb-2">SALDO INICIAL</div>
          <div className="text-2xl font-bold text-secondary mb-1">
            R$ {dfc.saldoInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">Abertura do período</div>
        </div>

        {/* Entradas */}
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-muted">ENTRADAS (+)</span>
            <ArrowUpRight size={18} className="text-success" />
          </div>
          <div className="text-2xl font-bold text-success mb-1">
            R$ {dfc.totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">Recebimentos liquidados</div>
        </div>

        {/* Saídas */}
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-muted">SAÍDAS (-)</span>
            <ArrowDownRight size={18} className="text-danger" />
          </div>
          <div className="text-2xl font-bold text-danger mb-1">
            R$ {dfc.totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">Pagamentos efetuados</div>
        </div>

        {/* Resultado do Período */}
        <div className="card">
          <div className="text-xs font-semibold text-muted mb-2">RESULTADO LÍQUIDO</div>
          <div className={`text-2xl font-bold mb-1 ${dfc.resultadoLiquido >= 0 ? 'text-primary' : 'text-danger'}`}>
            {dfc.resultadoLiquido >= 0 ? '+' : ''} R$ {dfc.resultadoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className={`badge ${dfc.resultadoLiquido >= 0 ? 'badge-success' : 'badge-danger'}`}>
            {dfc.resultadoLiquido >= 0 ? 'Superávit' : 'Déficit'}
          </span>
        </div>

        {/* Saldo Final */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff' }}>
          <div className="text-xs font-semibold text-gray-400 mb-2">SALDO FINAL PROJETADO</div>
          <div className="text-2xl font-bold text-white mb-1">
            R$ {dfc.saldoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-400">Saldo acumulado em conta</div>
        </div>
      </div>

      {/* Gráfico Modular + Top Categorias */}
      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
            <div>
              <h3 className="font-bold text-lg">Evolução do Caixa</h3>
              <p className="text-xs text-muted">Entradas, saídas e saldo acumulado ao longo do período</p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="badge badge-success">
                <CheckCircle2 size={12} /> Realizado
              </span>
              <span className="badge badge-primary">
                <Clock size={12} /> Projetado
              </span>
              <span className="badge badge-purple">
                <ArrowLeftRight size={12} /> Movimentação não-operacional
              </span>
            </div>
          </div>

          <CashFlowBarChart data={filteredData} height={300} />
        </div>

        {/* Categorias Principais de Entrada e Saída */}
        <div className="card flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg mb-4">Top Categorias</h3>

            {/* Categorias de Entradas */}
            <div className="mb-6">
              <div className="text-xs font-bold text-muted uppercase mb-3 flex items-center gap-1">
                <ArrowUpRight size={14} className="text-success" />
                <span>Principais Fontes de Entrada</span>
              </div>
              <div className="flex flex-col gap-3">
                {dfc.topEntradasCategories.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex justify-between items-center text-xs mb-1 font-semibold">
                      <span>{cat.category}</span>
                      <span className="text-success">R$ {cat.value.toLocaleString('pt-BR')} ({cat.percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Categorias de Saídas */}
            <div>
              <div className="text-xs font-bold text-muted uppercase mb-3 flex items-center gap-1">
                <ArrowDownRight size={14} className="text-danger" />
                <span>Principais Destinos de Saída</span>
              </div>
              <div className="flex flex-col gap-3">
                {dfc.topSaidasCategories.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex justify-between items-center text-xs mb-1 font-semibold">
                      <span>{cat.category}</span>
                      <span className="text-danger">R$ {cat.value.toLocaleString('pt-BR')} ({cat.percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Movimentação Não-Operacional: caixa real (aportes, giro, distribuições) que
          não entra no ranking de despesas/receitas operacionais acima, mas afeta o saldo. */}
      <div className="report-card report-card-purple">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <ArrowLeftRight size={22} className="report-icon" />
            <div>
              <div className="report-title" style={{ marginBottom: '0.15rem' }}>
                Movimentação Não-Operacional do Período
              </div>
              <p className="text-xs text-muted" style={{ maxWidth: '420px' }}>
                Aportes, giro e distribuições (tag INVESTIMENTO_NAO_OPERACIONAL) — não afeta o lucro operacional, mas afeta o caixa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <div className="text-xs font-semibold text-muted mb-1">ENTRADAS</div>
              <div className="text-lg font-bold text-success">
                + R$ {dfc.nonOperationalSummary.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold text-muted mb-1">SAÍDAS</div>
              <div className="text-lg font-bold text-danger">
                - R$ {dfc.nonOperationalSummary.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold text-muted mb-1">LÍQUIDO</div>
              <div className="report-value text-lg font-bold">
                {dfc.nonOperationalSummary.net >= 0 ? '+' : ''} R$ {dfc.nonOperationalSummary.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <span className="badge badge-purple">
              {dfc.nonOperationalSummary.countTransactions} lançamento{dfc.nonOperationalSummary.countTransactions === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabela Detalhada do Extrato Diário */}
      <div className="card">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div>
            <h3 className="font-bold text-lg">Extrato Diário de Caixa</h3>
            <p className="text-xs text-muted">Detalhamento dos saldos e resultados dia a dia</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-medium">Filtro:</span>
            <span className="badge badge-primary">Todos os lançamentos</span>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Data / Dia</th>
                <th>Status</th>
                <th className="text-right">Entradas (R$)</th>
                <th className="text-right">Saídas (R$)</th>
                <th className="text-right">Resultado Diário (R$)</th>
                <th className="text-right">Saldo Acumulado (R$)</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr key={item.date}>
                  <td>
                    <div className="font-bold text-sm">{item.date} ({item.dayName})</div>
                  </td>
                  <td>
                    <span className={`badge ${item.status === 'realizado' ? 'badge-success' : 'badge-primary'}`}>
                      {item.status === 'realizado' ? 'Realizado' : 'Projetado'}
                    </span>
                  </td>
                  <td className="text-right font-medium text-success text-sm">
                    {item.entradas > 0 ? `+ R$ ${item.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="text-right font-medium text-danger text-sm">
                    {item.saidas > 0 ? `- R$ ${item.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="text-right font-bold text-sm">
                    <span className={item.resultado >= 0 ? 'text-success' : 'text-danger'}>
                      {item.resultado >= 0 ? '+' : ''} R$ {item.resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="text-right font-bold text-primary text-sm">
                    R$ {item.saldoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

