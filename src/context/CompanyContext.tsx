'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { Company } from '@/lib/constants/companies';

export interface TenantInfo {
  id: string;
  name: string;
  document: string | null;
  isActive: boolean;
}

interface CompanyContextType {
  selectedCompany: Company;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

// Usado só enquanto o tenant real (vindo da sessão) ainda não carregou.
const LOADING_COMPANY: Company = {
  id: 'loading',
  name: 'Carregando...',
  cnpj: '—',
  segment: 'Gestão Financeira',
  status: 'Pendente',
};

interface CompanyProviderProps {
  children: ReactNode;
  /** Tenant do usuário logado (vem da sessão via /api/auth/me). Cada usuário
   * pertence a um único tenant — não existe mais "troca de empresa". */
  tenant?: TenantInfo | null;
}

export function CompanyProvider({ children, tenant }: CompanyProviderProps) {
  const selectedCompany: Company = tenant
    ? {
        id: tenant.id,
        name: tenant.name,
        cnpj: tenant.document || 'CNPJ não cadastrado',
        segment: 'Gestão Financeira',
        status: tenant.isActive ? 'Ativa' : 'Inativa',
      }
    : LOADING_COMPANY;

  return <CompanyContext.Provider value={{ selectedCompany }}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
