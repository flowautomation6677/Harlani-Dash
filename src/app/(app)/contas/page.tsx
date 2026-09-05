'use client';

import { useEffect, useState } from 'react';
import { useCompany } from '@/context/CompanyContext';
import {
  getAccountsSummary,
  getAgingHistory,
  getLiquidityRunway,
  AccountsPayableReceivableSummary,
  AgingBucketItem,
  LiquidityRunwayPoint
} from '@/lib/api/niboClient';
import {
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Plus,
  Check,
  History,
  TrendingUp
} from 'lucide-react';

import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { AgingBucketChart } from '@/components/charts/AgingBucketChart';
import { LiquidityRunwayChart } from '@/components/charts/LiquidityRunwayChart';

function getStatusBadgeConfig(status: string) {
  if (status === 'pago') {
    return { className: 'badge-success', label: 'Liquidado' };
  }
  if (status === 'pendente') {
    return { className: 'badge-warning', label: 'A Vencer' };
  }
  return { className: 'badge-danger', label: 'Atrasado' };
}

export default function ContasPage() {
  const { selectedCompany } = useCompany();
  const [data, setData] = useState<AccountsPayableReceivableSummary | null>(null);
  const [agingHistory, setAgingHistory] = useState<AgingBucketItem[]>([]);
  const [runway, setRunway] = useState<LiquidityRunwayPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Filtros
  const [typeFilter, setTypeFilter] = useState<'all' | 'receita' | 'despesa'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pago' | 'pendente' | 'atrasado'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadAccounts() {
      setLoading(true);
      setError(null);
      try {
        const [res, aging, runwayPoints] = await Promise.all([
          getAccountsSummary(),
          getAgingHistory(6),
          getLiquidityRunway(60)
        ]);
        setData(res);
        setAgingHistory(aging);
        setRunway(runwayPoints);
      } catch (err) {
        setData(null);
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar o Nibo.');
      } finally {
        setLoading(false);
      }
    }
    loadAccounts();
  }, [selectedCompany.id, retryCount]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? undefined} onRetry={() => setRetryCount(c => c + 1)} />;
  }

  // Filtrar lista
  const filteredAccounts = data.accounts.filter(acc => {
    const matchesType = typeFilter === 'all' || acc.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || acc.status === statusFilter;
    const matchesSearch = 
      acc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.clientSupplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const pctRecebido = (data.totalRecebido / (data.totalReceber || 1)) * 100;
  const pctPago = (data.totalPago / (data.totalPagar || 1)) * 100;

  const maxAtrasoHistorico = agingHistory.reduce((max, item) => {
    const total = item.faixa0a30 + item.faixa31a60 + item.faixa61a90 + item.faixa90mais;
    return Math.max(max, total);
  }, 0);

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Header com Contexto */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-primary font-bold text-xl">
            <FileText size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Contas a Pagar & Receber — {selectedCompany.name}</h1>
              <span className="badge badge-primary">Nibo Integration</span>
            </div>
            <p className="text-xs text-muted mt-1">
              Gestão de títulos, vencimentos, conciliação e recebimentos
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" className="btn btn-outline gap-2 text-xs">
            <Download size={16} />
            Exportar Relatório
          </button>
          <button type="button" className="btn btn-primary gap-2 text-xs">
            <Plus size={16} />
            Novo Título
          </button>
        </div>
      </div>

      {/* KPI Cards de Resumo */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Total a Receber */}
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-muted">CONTAS A RECEBER (MÊS)</span>
            <ArrowUpRight size={18} className="text-success" />
          </div>
          <div className="text-2xl font-bold text-success mb-1">
            R$ {data.totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">
            Liquidado: <strong className="text-success">R$ {data.totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> ({pctRecebido.toFixed(1)}%)
          </div>
        </div>

        {/* Total a Pagar */}
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-muted">CONTAS A PAGAR (MÊS)</span>
            <ArrowDownRight size={18} className="text-danger" />
          </div>
          <div className="text-2xl font-bold text-danger mb-1">
            R$ {data.totalPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">
            Pago: <strong className="text-danger">R$ {data.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> ({pctPago.toFixed(1)}%)
          </div>
        </div>

        {/* Inadimplência / Atrasadas */}
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-muted">TÍTULOS EM ATRASO</span>
            <AlertTriangle size={18} className="text-danger" />
          </div>
          <div className="text-2xl font-bold text-danger mb-1">
            R$ {(data.totalAtrasadoReceber + data.totalAtrasadoPagar).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">
            Contas pendentes que ultrapassaram o vencimento
          </div>
        </div>

        {/* Saldo Líquido Projetado */}
        <div className="card">
          <div className="text-xs font-semibold text-muted mb-2">BALANÇO LÍQUIDO PROJETADO</div>
          <div className={`text-2xl font-bold mb-1 ${(data.totalReceber - data.totalPagar) >= 0 ? 'text-primary' : 'text-danger'}`}>
            R$ {(data.totalReceber - data.totalPagar).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted mt-2">Diferença entre entradas e saídas previstas</div>
        </div>
      </div>

      {/* Contexto Histórico: aging por faixa nos últimos 6 meses + tendência de liquidez,
          para mostrar solidez ao longo do tempo em vez de só o instante atual. */}
      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <History size={18} className="text-danger" />
            <h3 className="font-bold text-lg">Histórico de Atrasos (6 meses)</h3>
          </div>
          <p className="text-xs text-muted mb-4">
            {maxAtrasoHistorico > 0
              ? <>Nos últimos 6 meses, você nunca ficou com mais de <strong className="text-danger">R$ {maxAtrasoHistorico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> em atraso.</>
              : 'Nos últimos 6 meses, sua empresa não registrou valores em atraso.'}
          </p>
          <AgingBucketChart data={agingHistory} height={260} />
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={18} className="text-primary" />
            <h3 className="font-bold text-lg">Projeção de Liquidez (60 dias)</h3>
          </div>
          <p className="text-xs text-muted mb-4">
            Saldo projetado somando contas a receber e a pagar previstas, dia a dia
          </p>
          <LiquidityRunwayChart data={runway} height={260} />
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="card flex flex-wrap justify-between items-center gap-4">
        {/* Abas por Tipo de Conta */}
        <div className="tabs-container">
          <button 
            type="button"
            className={`tab-btn ${typeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTypeFilter('all')}
          >
            Todas as Contas
          </button>
          <button 
            type="button"
            className={`tab-btn ${typeFilter === 'receita' ? 'active' : ''}`}
            onClick={() => setTypeFilter('receita')}
          >
            A Receber (Entradas)
          </button>
          <button 
            type="button"
            className={`tab-btn ${typeFilter === 'despesa' ? 'active' : ''}`}
            onClick={() => setTypeFilter('despesa')}
          >
            A Pagar (Saídas)
          </button>
        </div>

        {/* Filtros de Status + Campo de Busca */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-muted font-medium">
            <Filter size={14} />
            <span>Status:</span>
          </div>

          <div className="tabs-container">
            <button 
              type="button"
              className={`tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              Todos
            </button>
            <button 
              type="button"
              className={`tab-btn ${statusFilter === 'pago' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pago')}
            >
              Pago / Baixado
            </button>
            <button 
              type="button"
              className={`tab-btn ${statusFilter === 'pendente' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pendente')}
            >
              Pendente
            </button>
            <button 
              type="button"
              className={`tab-btn ${statusFilter === 'atrasado' ? 'active' : ''}`}
              onClick={() => setStatusFilter('atrasado')}
            >
              Atrasado
            </button>
          </div>

          <div className="custom-select-container" style={{ padding: '0.4rem 0.75rem' }}>
            <Search size={16} className="text-muted" />
            <input 
              type="text" 
              placeholder="Buscar título, documento ou cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="custom-select"
              style={{ width: '200px' }}
            />
          </div>
        </div>
      </div>

      {/* Tabela de Títulos */}
      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Doc. / Título</th>
                <th>Cliente / Fornecedor</th>
                <th>Categoria</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th className="text-right">Valor (R$)</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted p-8">
                    Nenhum título encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map(acc => {
                  const statusBadge = getStatusBadgeConfig(acc.status);
                  return (
                    <tr key={acc.id}>
                      <td>
                        <div className="font-semibold text-sm">{acc.description}</div>
                        <div className="text-xs text-muted font-mono">{acc.documentNumber}</div>
                      </td>
                      <td>
                        <div className="text-sm font-medium text-secondary">{acc.clientSupplier}</div>
                      </td>
                      <td>
                        <span className="badge badge-primary text-xs">
                          {acc.category}
                        </span>
                      </td>
                      <td className="text-sm font-medium text-muted">
                        {acc.dueDate}
                      </td>
                      <td>
                        <span className={`badge ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="text-right font-bold text-sm">
                        <span className={acc.type === 'receita' ? 'text-success' : 'text-danger'}>
                          {acc.type === 'receita' ? '+ ' : '- '}
                          R$ {acc.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="text-center">
                        {acc.status !== 'pago' ? (
                          <button type="button" className="btn btn-outline text-xs p-1 px-2 gap-1 text-primary hover:bg-blue-50">
                            <Check size={14} />
                            Dar Baixa
                          </button>
                        ) : (
                          <span className="text-xs text-muted font-semibold">Baixado</span>
                        )}
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
