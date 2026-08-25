'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PieChart, DollarSign, FileText, Users, BarChart3, Settings, LogOut } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Gageia<span className="text-primary">Gestão</span></h2>
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          <li className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
            <Link href="/" className="nav-link">
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
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="nav-link w-full text-left bg-transparent border-none">
          <Settings size={20} />
          <span>Configurações</span>
        </button>
        <button type="button" className="nav-link w-full text-left text-danger bg-transparent border-none mt-2">
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
