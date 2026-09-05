import Link from 'next/link';
import { ShieldCheck, Building2, ChevronRight } from 'lucide-react';

// Índice do painel de admin — só existe pra listar as seções disponíveis
// (por enquanto, só /admin/tenants). Cresce conforme novas seções forem
// especificadas.
export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck size={22} className="text-primary" />
          Painel de Administração
        </h1>
        <p className="text-sm text-muted mt-1">Acesso restrito a usuários SUPER_ADMIN.</p>
      </div>

      <Link href="/admin/tenants" className="card card-interactive" style={{ display: 'flex', alignItems: 'center', gap: '1rem', maxWidth: '380px' }}>
        <Building2 size={24} className="text-primary" />
        <div style={{ flex: 1 }}>
          <div className="font-semibold text-sm">Tenants</div>
          <div className="text-xs text-muted">Ver todos os clientes do SaaS</div>
        </div>
        <ChevronRight size={18} className="text-muted" />
      </Link>
    </div>
  );
}
