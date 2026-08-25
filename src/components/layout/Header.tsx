'use client';

import { Bell, Search, Building2, ChevronDown, ShieldCheck } from 'lucide-react';
import { useCompany } from '@/context/CompanyContext';

export function Header() {
  const { selectedCompany, setSelectedCompanyId, companies } = useCompany();

  return (
    <header className="header">
      {/* Seletor de Cliente / Empresa */}
      <div className="flex items-center gap-3">
        <div className="custom-select-container">
          <Building2 size={18} className="text-primary" />
          <select 
            className="custom-select"
            value={selectedCompany.id}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
          >
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name} ({company.cnpj})
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="text-muted" />
        </div>
        
        <span className="badge badge-success">
          <ShieldCheck size={12} />
          {selectedCompany.status}
        </span>
      </div>
      
      {/* Busca e Perfil */}
      <div className="header-actions">
        <div className="header-search">
          <div className="flex items-center gap-2 text-muted">
            <Search size={18} />
            <input type="text" placeholder="Buscar lançamento, cliente..." />
          </div>
        </div>

        <button type="button" className="btn text-muted hover:text-primary transition-colors relative" title="Notificações">
          <Bell size={20} />
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--danger)'
          }} />
        </button>

        <div className="user-profile cursor-pointer">
          <div className="avatar">GG</div>
          <div>
            <div className="text-sm font-semibold">Gageia Gestão</div>
            <div className="text-xs text-muted">Consultoria & BPO Financeiro</div>
          </div>
        </div>
      </div>
    </header>
  );
}
