'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, PieChart, DollarSign, FileText, Users, BarChart3, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { HarlaniLogo } from '@/components/brand/HarlaniLogo';
import type { CurrentUser } from '@/lib/auth/types';

interface SidebarProps {
  readonly isOpen?: boolean;
  readonly onNavigate?: () => void;
  readonly currentUser?: CurrentUser | null;
}

export function Sidebar({ isOpen = false, onNavigate, currentUser }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <HarlaniLogo variant="compact" />
      </div>

      {/* Fecha o drawer ao navegar (irrelevante no desktop, onde a sidebar
          já fica sempre visível independente desse estado). */}
      <nav className="sidebar-nav" onClick={onNavigate}>
        <ul>
          <li className={`nav-item ${pathname === '/dashboard' ? 'active' : ''}`}>
            <Link href="/dashboard" className="nav-link">
              <Home size={20} />
              <span>Dashboard</span>
            </Link>
          </li>
          <li className={`nav-item ${pathname === '/fluxo' ? 'active' : ''}`}>
            <Link href="/fluxo" className="nav-link">
              <DollarSign size={20} />
              <span>Fluxo de Caixa</span>
            </Link>
          </li>
          <li className={`nav-item ${pathname === '/dre' ? 'active' : ''}`}>
            <Link href="/dre" className="nav-link">
              <PieChart size={20} />
              <span>DRE Gerencial</span>
            </Link>
          </li>
          <li className={`nav-item ${pathname === '/contas' ? 'active' : ''}`}>
            <Link href="/contas" className="nav-link">
              <FileText size={20} />
              <span>Contas a Pagar/Receber</span>
            </Link>
          </li>
          <li className={`nav-item ${pathname === '/clientes' ? 'active' : ''}`}>
            <Link href="/clientes" className="nav-link">
              <Users size={20} />
              <span>Clientes & Fornecedores</span>
            </Link>
          </li>
          <li className={`nav-item ${pathname === '/relatorios' ? 'active' : ''}`}>
            <Link href="/relatorios" className="nav-link">
              <BarChart3 size={20} />
              <span>Relatórios Mensais</span>
            </Link>
          </li>
          {currentUser?.role === 'SUPER_ADMIN' && (
            <li className={`nav-item ${pathname.startsWith('/admin') ? 'active' : ''}`}>
              <Link href="/admin/tenants" className="nav-link">
                <ShieldCheck size={20} />
                <span>Administração</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="nav-link w-full text-left bg-transparent border-none">
          <Settings size={20} />
          <span>Configurações</span>
        </button>
        <button
          type="button"
          className="nav-link w-full text-left text-danger bg-transparent border-none mt-2"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
