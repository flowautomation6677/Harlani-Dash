'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { COMPANIES, Company } from '@/lib/constants/companies';

interface CompanyContextType {
  selectedCompany: Company;
  setSelectedCompanyId: (id: string) => void;
  companies: Company[];
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const defaultCompany: Company = {
  id: '1',
  name: 'Harlani Tecnologia LTDA',
  cnpj: '12.345.678/0001-90',
  segment: 'Tecnologia & SaaS',
  status: 'Ativa'
};

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string>('1');

  const companyList = COMPANIES || [defaultCompany];
  const selectedCompany = companyList.find(c => c?.id === selectedCompanyId) || companyList[0] || defaultCompany;

  const setSelectedCompanyId = (id: string) => {
    setSelectedCompanyIdState(id);
  };

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompanyId, companies: companyList }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
