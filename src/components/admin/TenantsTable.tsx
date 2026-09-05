'use client';

import { useState, type FormEvent } from 'react';
import { Building2, Plus, KeyRound, Mail, Ban, CheckCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useToast, ToastContainer } from '@/components/ui/Toast';

export interface TenantRow {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string; // ISO — formatada no cliente pra evitar surpresa de serialização Server->Client
  primaryUserEmail: string | null;
  niboIntegrationActive: boolean;
}

interface TenantsTableProps {
  readonly initialTenants: TenantRow[];
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null);
  return data?.error || fallback;
}

export function TenantsTable({ initialTenants }: TenantsTableProps) {
  const [tenants, setTenants] = useState<TenantRow[]>(initialTenants);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const { toasts, showToast, dismissToast } = useToast();

  function updateTenant(id: string, patch: Partial<TenantRow>) {
    setTenants((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function handleToggleActive(tenant: TenantRow) {
    const nextActive = !tenant.isActive;
    setActionLoadingId(tenant.id);
    try {
      const response = await fetch(`/api/admin/clientes/${tenant.id}/desativar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, 'Falha ao atualizar o status do cliente.'));
      }
      updateTenant(tenant.id, { isActive: nextActive });
      showToast('success', `${tenant.name} ${nextActive ? 'reativado' : 'desativado'} com sucesso.`);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Falha ao atualizar o status do cliente.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleResendEmail(tenant: TenantRow) {
    setActionLoadingId(tenant.id);
    try {
      const response = await fetch(`/api/admin/clientes/${tenant.id}/reenviar-email`, { method: 'POST' });
      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, 'Falha ao reenviar o e-mail.'));
      }
      const data = await response.json();
      showToast('success', `E-mail de definição de senha reenviado para ${data.sentTo}.`);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Falha ao reenviar o e-mail.');
    } finally {
      setActionLoadingId(null);
    }
  }

  function handleCreated(tenant: TenantRow) {
    setTenants((prev) => [tenant, ...prev]);
    setIsCreateOpen(false);
    showToast('success', `Cliente "${tenant.name}" criado com sucesso.`);
  }

  function handleKeyUpdated(tenantId: string) {
    updateTenant(tenantId, { niboIntegrationActive: true });
    setEditingTenant(null);
    showToast('success', 'Chave do Nibo atualizada com sucesso.');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 size={22} className="text-primary" />
            Tenants
          </h1>
          <p className="text-sm text-muted mt-1">
            Todos os clientes cadastrados no SaaS — {tenants.length} no total.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>E-mail do responsável</th>
                <th className="text-center">Status do Cliente</th>
                <th className="text-center">Integração Nibo</th>
                <th>Criado em</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted p-8">
                    Nenhum tenant cadastrado ainda.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-muted" />
                        <span className="font-semibold text-sm">{tenant.name}</span>
                      </div>
                    </td>
                    <td className="text-xs text-muted">{tenant.primaryUserEmail || '—'}</td>
                    <td className="text-center">
                      <span className={`badge ${tenant.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {tenant.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`badge ${tenant.niboIntegrationActive ? 'badge-success' : 'badge-warning'}`}>
                        {tenant.niboIntegrationActive ? 'Ativa' : 'Pendente'}
                      </span>
                    </td>
                    <td className="text-xs text-muted">{new Date(tenant.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="btn text-muted hover:text-primary"
                          title="Editar Chave do Nibo"
                          disabled={actionLoadingId === tenant.id}
                          onClick={() => setEditingTenant(tenant)}
                        >
                          <KeyRound size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn text-muted hover:text-primary"
                          title="Reenviar e-mail de senha"
                          disabled={actionLoadingId === tenant.id}
                          onClick={() => handleResendEmail(tenant)}
                        >
                          <Mail size={16} />
                        </button>
                        <button
                          type="button"
                          className={`btn text-muted ${tenant.isActive ? 'hover:text-danger' : 'hover:text-success'}`}
                          title={tenant.isActive ? 'Desativar Cliente' : 'Ativar Cliente'}
                          disabled={actionLoadingId === tenant.id}
                          onClick={() => handleToggleActive(tenant)}
                        >
                          {tenant.isActive ? <Ban size={16} /> : <CheckCircle size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateClientModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={handleCreated} />
      <EditNiboKeyModal tenant={editingTenant} onClose={() => setEditingTenant(null)} onUpdated={handleKeyUpdated} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: Novo Cliente
// ---------------------------------------------------------------------------

interface CreateClientModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onCreated: (tenant: TenantRow) => void;
}

function CreateClientModal({ isOpen, onClose, onCreated }: CreateClientModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [niboApiKey, setNiboApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resetAndClose() {
    setCompanyName('');
    setClientEmail('');
    setNiboApiKey('');
    setError(null);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, clientEmail, niboApiKey }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || 'Falha ao criar cliente.');
        return;
      }

      onCreated({
        id: data.tenant.id,
        name: data.tenant.name,
        isActive: true,
        createdAt: data.tenant.createdAt,
        primaryUserEmail: data.user.email,
        niboIntegrationActive: true,
      });
      setCompanyName('');
      setClientEmail('');
      setNiboApiKey('');
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Novo Cliente">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="companyName" className="text-sm font-semibold" style={{ display: 'block', marginBottom: '0.375rem' }}>
            Nome da Empresa
          </label>
          <input
            id="companyName"
            type="text"
            className="input-field"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="clientEmail" className="text-sm font-semibold" style={{ display: 'block', marginBottom: '0.375rem' }}>
            E-mail do Responsável
          </label>
          <input
            id="clientEmail"
            type="email"
            className="input-field"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="niboApiKey" className="text-sm font-semibold" style={{ display: 'block', marginBottom: '0.375rem' }}>
            Chave da API do Nibo
          </label>
          <input
            id="niboApiKey"
            type="text"
            className="input-field"
            value={niboApiKey}
            onChange={(e) => setNiboApiKey(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Criando...' : 'Criar Cliente'}
        </button>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Modal: Editar Chave do Nibo
// ---------------------------------------------------------------------------

interface EditNiboKeyModalProps {
  readonly tenant: TenantRow | null;
  readonly onClose: () => void;
  readonly onUpdated: (tenantId: string) => void;
}

function EditNiboKeyModal({ tenant, onClose, onUpdated }: EditNiboKeyModalProps) {
  const [niboApiKey, setNiboApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setNiboApiKey('');
    setError(null);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/clientes/${tenant.id}/nibo-key`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niboApiKey }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || 'Falha ao atualizar a chave.');
        return;
      }

      setNiboApiKey('');
      onUpdated(tenant.id);
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={!!tenant} onClose={handleClose} title={`Editar Chave do Nibo — ${tenant?.name ?? ''}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="editNiboApiKey" className="text-sm font-semibold" style={{ display: 'block', marginBottom: '0.375rem' }}>
            Nova Chave da API do Nibo
          </label>
          <input
            id="editNiboApiKey"
            type="text"
            className="input-field"
            value={niboApiKey}
            onChange={(e) => setNiboApiKey(e.target.value)}
            required
            autoFocus
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Salvando...' : 'Salvar Nova Chave'}
        </button>
      </form>
    </Modal>
  );
}
