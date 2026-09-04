import type { ReactNode } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Shell (sidebar + header) aplicado só às páginas autenticadas do app
// (dashboard, fluxo, dre, contas, clientes, relatorios) — /login fica de
// fora deste grupo de rotas e não recebe esse layout.
export default function AppLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
