import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/getSession';
import { listTenants } from '@/lib/repositories/tenantRepository';
import { TenantsTable, type TenantRow } from '@/components/admin/TenantsTable';

export const dynamic = 'force-dynamic';

// O proxy (src/proxy.ts) já bloqueia CLIENT nesta rota via canAccessPath().
// Checamos de novo aqui como segunda camada — se algum dia o proxy for
// removido/reconfigurado por engano, esta página continua protegida sozinha.
export default async function AdminTenantsPage() {
  const session = await getServerSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const tenants = await listTenants();

  const rows: TenantRow[] = tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    isActive: tenant.isActive,
    createdAt: tenant.createdAt.toISOString(),
    primaryUserEmail: tenant.users[0]?.email ?? null,
    niboIntegrationActive: tenant.integrations.some((i) => i.provider === 'NIBO' && i.isActive),
  }));

  return <TenantsTable initialTenants={rows} />;
}
