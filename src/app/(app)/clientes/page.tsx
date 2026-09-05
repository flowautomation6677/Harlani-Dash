'use client';

import { useEffect, useState, useMemo } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { getStakeholders, Stakeholder } from '@/lib/api/niboClient';
import { 
  Users, 
  Search, 
  Building, 
  User, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Activity,
  CreditCard,
  Briefcase
} from 'lucide-react';

import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';

export default function ClientesFornecedoresPage() {
  const { selectedCompany } = useCompany();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'Customer' | 'Supplier'>('all');
  const [personFilter, setPersonFilter] = useState<'all' | 'pj' | 'pf'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await getStakeholders();
        setStakeholders(res);
      } catch (err) {
        setStakeholders([]);
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar o Nibo.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCompany.id, retryCount]);

  const filteredList = useMemo(() => {
    return stakeholders.filter(stk => {
      const matchType = filterType === 'all' || stk.type === filterType;
      const matchPerson = 
        personFilter === 'all' || 
        (personFilter === 'pj' && stk.isCompany) || 
        (personFilter === 'pf' && !stk.isCompany);
      
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = 
        stk.name.toLowerCase().includes(searchLower) ||
        stk.documentNumber.includes(searchLower);

      return matchType && matchPerson && matchSearch;
    });
  }, [stakeholders, filterType, personFilter, searchTerm]);

  const totalClientes = stakeholders.filter(s => s.type === 'Customer').length;
  const totalFornecedores = stakeholders.filter(s => s.type === 'Supplier').length;

  const topClientes = useMemo(() => {
    return [...stakeholders]
      .filter(s => s.type === 'Customer')
      .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
      .slice(0, 5);
  }, [stakeholders]);

  const topFornecedores = useMemo(() => {
    return [...stakeholders]
      .filter(s => s.type === 'Supplier')
      .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
      .slice(0, 5);
  }, [stakeholders]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => setRetryCount(c => c + 1)} />;
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-primary font-bold text-xl">
            <Users size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Clientes & Fornecedores — {selectedCompany.name}</h1>
              <span className="badge badge-primary">251 Cadastros Nibo</span>
            </div>
            <p className="text-xs text-muted mt-1">
              Base oficial de contatos, parceiros comerciais e histórico de relacionamento
            </p>
          </div>
        </div>

        <button 
          type="button" 
          onClick={() => alert("Exportando lista de contatos em formato CSV...")}
          className="btn btn-outline gap-2 text-xs"
        >
          <Download size={16} />
          Exportar Base
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card">
          <div className="text-xs font-semibold text-muted mb-2">TOTAL DE CONTATOS ATIVOS</div>
          <div className="text-2xl font-bold text-secondary mb-1">
            {stakeholders.length}
          </div>
          <div className="text-xs text-muted">Sincronizados com a base fiscal</div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-muted">CLIENTES CADASTRADOS</span>
            <ArrowUpRight size={18} className="text-success" />
          </div>
          <div className="text-2xl font-bold text-success mb-1">
            {totalClientes}
          </div>
          <div className="text-xs text-muted">Contas e compradores</div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-muted">FORNECEDORES & PARCEIROS</span>
            <ArrowDownRight size={18} className="text-danger" />
          </div>
          <div className="text-2xl font-bold text-danger mb-1">
            {totalFornecedores}
          </div>
          <div className="text-xs text-muted">Prestadores e fornecedores</div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-muted mb-2">PESSOAS JURÍDICAS (CNPJ)</div>
          <div className="text-2xl font-bold text-primary mb-1">
            {stakeholders.filter(s => s.isCompany).length}
          </div>
          <div className="text-xs text-muted">
            {stakeholders.filter(s => !s.isCompany).length} pessoas físicas (CPF)
          </div>
        </div>
      </div>

      {/* Destaques: Top Clientes e Top Fornecedores */}
      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {/* Top Clientes */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={18} className="text-success" />
            <h3 className="font-bold text-base">Top Clientes em Faturamento</h3>
          </div>
          <div className="flex flex-col gap-3">
            {topClientes.map((c, i) => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-bold flex items-center justify-center flex-shrink-0 text-success"
                    style={{ width: '24px', height: '24px', borderRadius: '9999px', backgroundColor: 'var(--secondary-light)' }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-xs text-secondary">{c.name}</div>
                    <div className="text-xs text-muted font-mono" style={{ fontSize: '0.6875rem' }}>{c.documentNumber}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xs text-success">
                    {c.totalValue && c.totalValue > 0 ? `R$ ${c.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Ativo'}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.625rem' }}>{c.countTransactions || 0} títulos</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Fornecedores */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-danger" />
            <h3 className="font-bold text-base">Top Fornecedores em Despesas</h3>
          </div>
          <div className="flex flex-col gap-3">
            {topFornecedores.map((f, i) => (
              <div key={f.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-bold flex items-center justify-center flex-shrink-0 text-danger"
                    style={{ width: '24px', height: '24px', borderRadius: '9999px', backgroundColor: 'var(--danger-light)' }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-xs text-secondary">{f.name}</div>
                    <div className="text-xs text-muted font-mono" style={{ fontSize: '0.6875rem' }}>{f.documentNumber}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xs text-danger">
                    {f.totalValue && f.totalValue > 0 ? `R$ ${f.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Ativo'}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.625rem' }}>{f.countTransactions || 0} títulos</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="card flex flex-wrap justify-between items-center gap-4">
        <div className="tabs-container">
          <button 
            type="button" 
            className={`tab-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            Todos ({stakeholders.length})
          </button>
          <button 
            type="button" 
            className={`tab-btn ${filterType === 'Customer' ? 'active' : ''}`}
            onClick={() => setFilterType('Customer')}
          >
            Clientes ({totalClientes})
          </button>
          <button 
            type="button" 
            className={`tab-btn ${filterType === 'Supplier' ? 'active' : ''}`}
            onClick={() => setFilterType('Supplier')}
          >
            Fornecedores ({totalFornecedores})
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="tabs-container">
            <button 
              type="button" 
              className={`tab-btn ${personFilter === 'all' ? 'active' : ''}`}
              onClick={() => setPersonFilter('all')}
            >
              Todos
            </button>
            <button 
              type="button" 
              className={`tab-btn ${personFilter === 'pj' ? 'active' : ''}`}
              onClick={() => setPersonFilter('pj')}
            >
              Pessoa Jurídica (CNPJ)
            </button>
            <button 
              type="button" 
              className={`tab-btn ${personFilter === 'pf' ? 'active' : ''}`}
              onClick={() => setPersonFilter('pf')}
            >
              Pessoa Física (CPF)
            </button>
          </div>

          <div className="custom-select-container" style={{ padding: '0.4rem 0.75rem' }}>
            <Search size={16} className="text-muted" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou documento..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="custom-select"
              style={{ width: '220px' }}
            />
          </div>
        </div>
      </div>

      {/* Tabela de Contatos */}
      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Nome / Razão Social</th>
                <th>Tipo</th>
                <th>Documento</th>
                <th>Enquadramento</th>
                <th className="text-right">Volume Movimentado</th>
                <th className="text-center">Títulos</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted p-8">
                    Nenhum contato encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredList.map(stk => (
                  <tr key={stk.id}>
                    <td>
                      <div className="font-semibold text-sm">{stk.name}</div>
                    </td>
                    <td>
                      <span className={`badge ${stk.type === 'Customer' ? 'badge-success' : 'badge-primary'}`}>
                        {stk.type === 'Customer' ? 'Cliente' : 'Fornecedor'}
                      </span>
                    </td>
                    <td className="text-xs font-mono font-medium text-muted">
                      {stk.documentNumber}
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-xs text-secondary">
                        {stk.isCompany ? <Building size={14} className="text-primary" /> : <User size={14} className="text-muted" />}
                        <span>{stk.isCompany ? 'Pessoa Jurídica' : 'Pessoa Física'}</span>
                      </div>
                    </td>
                    <td className="text-right font-bold text-sm">
                      {stk.totalValue && stk.totalValue > 0 ? (
                        <span className={stk.type === 'Customer' ? 'text-success' : 'text-danger'}>
                          {stk.type === 'Customer' ? '+ ' : '- '}
                          R$ {stk.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-muted font-normal text-xs">Sem movimentação</span>
                      )}
                    </td>
                    <td className="text-center text-xs font-semibold text-muted">
                      {stk.countTransactions || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
