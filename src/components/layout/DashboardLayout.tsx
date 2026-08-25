'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CompanyProvider } from '@/context/CompanyContext';
import './layout.css';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <CompanyProvider>
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <Header />
          <main className="content-area">
            {children}
          </main>
        </div>
      </div>
    </CompanyProvider>
  );
}
