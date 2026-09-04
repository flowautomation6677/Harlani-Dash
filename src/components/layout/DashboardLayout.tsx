'use client';

import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CompanyProvider } from '@/context/CompanyContext';
import './layout.css';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <CompanyProvider>
      <div className="dashboard-container">
        <Sidebar isOpen={isSidebarOpen} onNavigate={() => setIsSidebarOpen(false)} />
        {isSidebarOpen && (
          <button
            type="button"
            className="sidebar-overlay"
            aria-label="Fechar menu de navegação"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <div className="main-content">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="content-area">
            {children}
          </main>
        </div>
      </div>
    </CompanyProvider>
  );
}
