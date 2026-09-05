/**
 * CompanyContext.test.tsx
 *
 * Testes unitarios para o CompanyContext.
 * Desde a Fase 5 (multi-tenant), não existe mais lista de empresas nem troca
 * manual — o "selectedCompany" é derivado do tenant real do usuário logado
 * (passado via prop, vindo de /api/auth/me). Cobrimos: derivação correta a
 * partir do tenant, fallback de loading, e proteção de contexto.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CompanyProvider, useCompany, type TenantInfo } from '@/context/CompanyContext';

function TestConsumer() {
  const { selectedCompany } = useCompany();
  return (
    <div>
      <span data-testid="company-id">{selectedCompany.id}</span>
      <span data-testid="company-name">{selectedCompany.name}</span>
      <span data-testid="company-cnpj">{selectedCompany.cnpj}</span>
      <span data-testid="company-status">{selectedCompany.status}</span>
    </div>
  );
}

const mockTenant: TenantInfo = {
  id: 'tenant-1',
  name: 'Harlani Rodrigues',
  document: '23.121.297/0001-49',
  isActive: true,
};

describe('CompanyContext — derivação a partir do tenant real', () => {
  it('deve expor os dados do tenant logado como selectedCompany', () => {
    render(
      <CompanyProvider tenant={mockTenant}>
        <TestConsumer />
      </CompanyProvider>
    );

    expect(screen.getByTestId('company-id').textContent).toBe('tenant-1');
    expect(screen.getByTestId('company-name').textContent).toBe('Harlani Rodrigues');
    expect(screen.getByTestId('company-cnpj').textContent).toBe('23.121.297/0001-49');
  });

  it('deve refletir status "Ativa" quando o tenant está ativo', () => {
    render(
      <CompanyProvider tenant={mockTenant}>
        <TestConsumer />
      </CompanyProvider>
    );

    expect(screen.getByTestId('company-status').textContent).toBe('Ativa');
  });

  it('deve refletir status "Inativa" quando o tenant está desativado', () => {
    render(
      <CompanyProvider tenant={{ ...mockTenant, isActive: false }}>
        <TestConsumer />
      </CompanyProvider>
    );

    expect(screen.getByTestId('company-status').textContent).toBe('Inativa');
  });

  it('deve usar "CNPJ não cadastrado" quando o tenant não tem documento', () => {
    render(
      <CompanyProvider tenant={{ ...mockTenant, document: null }}>
        <TestConsumer />
      </CompanyProvider>
    );

    expect(screen.getByTestId('company-cnpj').textContent).toBe('CNPJ não cadastrado');
  });

  it('deve cair num estado de "Carregando..." quando o tenant ainda não chegou (ex: sessão de SUPER_ADMIN sem tenant, ou fetch em andamento)', () => {
    render(
      <CompanyProvider tenant={null}>
        <TestConsumer />
      </CompanyProvider>
    );

    expect(screen.getByTestId('company-name').textContent).toBe('Carregando...');
  });

  it('deve usar o mesmo fallback quando nenhuma prop tenant é passada', () => {
    render(
      <CompanyProvider>
        <TestConsumer />
      </CompanyProvider>
    );

    expect(screen.getByTestId('company-name').textContent).toBe('Carregando...');
  });
});

describe('CompanyContext — proteção de contexto', () => {
  it('deve lançar erro quando useCompany é usado fora do CompanyProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function OrphanConsumer() {
      useCompany(); // Sem provider!
      return null;
    }

    expect(() => render(<OrphanConsumer />)).toThrow('useCompany must be used within a CompanyProvider');

    consoleSpy.mockRestore();
  });
});
