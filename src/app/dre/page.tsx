'use client';

import { useEffect, useState } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { getDREData, DREData, DRELineItem } from '@/lib/api/niboClient';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  Building2, 
  Download, 
  Printer, 
  TrendingUp, 
  DollarSign, 
  PieChart as PieIcon, 
  FileSpreadsheet,
  Activity,
  ChevronRight,
  Info
} from 'lucide-react';

export default function DREPage() {
  const { selectedCompany } = useCompany();
  const [dre, setDre] = useState<DREData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('2026-ytd');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadDRE() {
      setLoading(true);
      const data = await getDREData(selectedCompany.id, period);
      setDre(data);
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
        period: `DRE Analítico (${period === '2026-m' ? 'Mês Atual' : period === '2026-q' ? 'Último Trimestre' : 'Ano YTD'})`
      });
    } catch (e) {
      alert("Erro ao exportar o DRE.");
    }
  };

  if (loading || !dre) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted">
        <Activity className="animate-spin text-primary" size={32} />
        <div className="text-sm font-medium">Gerando Demonstrativo do Resultado (DRE) para {selectedCompany.name}...</div>
      </div>
    );
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
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card">
          <div className="text-xs font-semibold text-muted mb-2">RECEITA OPERACIONAL LÍQUIDA</div>
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
            Margem Bruta: <strong>{((dre.lucroBruto / dre.receitaBruta) * 100).toFixed(1)}%</strong>
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-muted mb-2">EBITDA (LAJIDA)</div>
          <div className="text-2xl font-bold text-purple mb-1">
            R$ {dre.ebitda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-xs text-purple font-semibold">
            <TrendingUp size={14} />
            <span>Margem EBITDA: {dre.margemEbitda}%</span>
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-muted mb-2">LUCRO LÍQUIDO</div>
          <div className="text-2xl font-bold text-emerald-600 mb-1" style={{ color: '#059669' }}>
            R$ {dre.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted">
            Margem Líquida: <strong style={{ color: '#059669' }}>{dre.margemLiquida}%</strong>
          </div>
        </div>
      </div>

      {/* Gráfico Sintético da Estrutura DRE + Dicas */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-base">Composição dos Resultados (R$)</h3>
              <p className="text-xs text-muted">Distribuição da Receita Bruta até o Lucro Líquido final</p>
            </div>
          </div>
          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(val: number) => [`R$ ${val.toLocaleString('pt-BR')}`, 'Valor']}
                />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resumo da Análise de DRE */}
        <div className="card flex flex-col justify-between bg-gradient-to-br from-white to-purple-50">
          <div>
            <div className="flex items-center gap-2 mb-3 text-purple font-bold text-sm">
              <Info size={18} />
              <span>Análise do Especialista</span>
            </div>

            <p className="text-xs text-secondary leading-relaxed mb-4">
              A empresa <strong className="text-primary">{selectedCompany.name}</strong> apresenta uma margem líquida excelente de <strong>{dre.margemLiquida}%</strong>.
            </p>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs p-2 bg-white rounded border border-gray-100">
                <span className="text-muted">Impostos / Faturamento:</span>
                <span className="font-semibold text-warning">{Math.abs(dre.impostosDeducoes / dre.receitaBruta * 100).toFixed(1)}%</span>
              </div>

              <div className="flex justify-between items-center text-xs p-2 bg-white rounded border border-gray-100">
                <span className="text-muted">Peso dos Custos (CPV):</span>
                <span className="font-semibold text-danger">{Math.abs(dre.custosVendas / dre.receitaBruta * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted mt-4 pt-3 border-t border-gray-100">
            * Dados calculados a partir dos planos de contas do Nibo.
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
