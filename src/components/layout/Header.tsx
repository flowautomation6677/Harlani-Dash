'use client';

import { useEffect, useState } from 'react';
import { Bell, Search, Building2, ChevronDown, ShieldCheck, Menu } from 'lucide-react';
import { useCompany } from '@/context/CompanyContext';

interface HeaderProps {
  readonly onMenuClick?: () => void;
}

interface CurrentUser {
  name: string | null;
  email: string;
  role: 'SUPER_ADMIN' | 'CLIENT';
}

export function Header({ onMenuClick }: HeaderProps) {
  const { selectedCompany, setSelectedCompanyId, companies } = useCompany();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCurrentUser(data?.user ?? null))
      .catch(() => setCurrentUser(null));
  }, []);

  const displayName = currentUser?.name || currentUser?.email || 'Harlani Gestão';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="header">
      {/* Seletor de Cliente / Empresa */}
      <div className="flex items-center gap-3 header-brand-group">
        <button type="button" className="menu-toggle" onClick={onMenuClick} aria-label="Abrir menu de navegação">
          <Menu size={22} />
        </button>

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

        <span className="badge badge-success header-status-badge">
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
          <div className="avatar">{initials || 'HG'}</div>
          <div className="user-profile-info">
            <div className="text-sm font-semibold">{displayName}</div>
            <div className="text-xs text-muted">
              {currentUser?.role === 'SUPER_ADMIN' ? 'Administrador' : 'Consultoria & BPO Financeiro'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
