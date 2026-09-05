'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CompanyProvider } from '@/context/CompanyContext';
import type { CurrentUser } from '@/lib/auth/types';
import './layout.css';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCurrentUser(data?.user ?? null))
      .catch(() => setCurrentUser(null));
  }, []);

  return (
    <CompanyProvider tenant={currentUser?.tenant}>
      <div className="dashboard-container">
        <Sidebar isOpen={isSidebarOpen} onNavigate={() => setIsSidebarOpen(false)} currentUser={currentUser} />
        {isSidebarOpen && (
          <button
            type="button"
            className="sidebar-overlay"
            aria-label="Fechar menu de navegação"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <div className="main-content">
          <Header onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser} />
          <main className="content-area">
            {children}
          </main>
        </div>
      </div>
    </CompanyProvider>
  );
}
