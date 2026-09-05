'use client';

import { Bell, Search, Building2, ShieldCheck, Menu } from 'lucide-react';
import { useCompany } from '@/context/CompanyContext';
import type { CurrentUser } from '@/lib/auth/types';

interface HeaderProps {
  readonly onMenuClick?: () => void;
  readonly currentUser?: CurrentUser | null;
}

export function Header({ onMenuClick, currentUser }: HeaderProps) {
  const { selectedCompany } = useCompany();
  const isAdminWithoutTenant = currentUser?.role === 'SUPER_ADMIN' && !currentUser.tenant;

  const displayName = currentUser?.name || currentUser?.email || 'Harlani Gestão';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="header">
      {/* Tenant do usuário logado — cada usuário pertence a um único tenant,
          não existe mais seletor: quem troca de "empresa" é logando com
          outra conta. */}
      <div className="flex items-center gap-3 header-brand-group">
        <button type="button" className="menu-toggle" onClick={onMenuClick} aria-label="Abrir menu de navegação">
          <Menu size={22} />
        </button>

        {isAdminWithoutTenant ? (
          <div className="custom-select-container">
            <ShieldCheck size={18} className="text-primary" />
            <span className="custom-select" style={{ cursor: 'default' }}>
              Painel de Administração
            </span>
          </div>
        ) : (
          <>
            <div className="custom-select-container">
              <Building2 size={18} className="text-primary" />
              <span className="custom-select" style={{ cursor: 'default' }}>
                {selectedCompany.name} ({selectedCompany.cnpj})
              </span>
            </div>

            <span className={`badge ${selectedCompany.status === 'Ativa' ? 'badge-success' : 'badge-danger'} header-status-badge`}>
              <ShieldCheck size={12} />
              {selectedCompany.status}
            </span>
          </>
        )}
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
