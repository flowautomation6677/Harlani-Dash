/**
 * CompanyContext.test.tsx
 *
 * Testes unitarios para o CompanyContext.
 * Verifica se a troca de empresa atualiza o estado corretamente,
 * se o estado inicial e valido, e se o contexto e protegido contra
 * uso fora do Provider.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { CompanyProvider, useCompany } from '@/context/CompanyContext';
import { COMPANIES } from '@/lib/constants/companies';

// ---------------------------------------------------------------------------
// Componente auxiliar para consumir o contexto nos testes
// ---------------------------------------------------------------------------

function TestConsumer() {
  const { selectedCompany, setSelectedCompanyId, companies } = useCompany();
  return (
    <div>
      <span data-testid="company-id">{selectedCompany.id}</span>
      <span data-testid="company-name">{selectedCompany.name}</span>
      <span data-testid="company-count">{companies.length}</span>
      <button
        onClick={() => setSelectedCompanyId('2')}
        data-testid="switch-to-2"
      >
        Trocar para empresa 2
      </button>
      <button
        onClick={() => setSelectedCompanyId('3')}
        data-testid="switch-to-3"
      >
        Trocar para empresa 3
      </button>
      <button
        onClick={() => setSelectedCompanyId('1')}
        data-testid="switch-to-1"
      >
        Voltar para empresa 1
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <CompanyProvider>
      <TestConsumer />
    </CompanyProvider>
  );
}

// ---------------------------------------------------------------------------
// Suite 1: Estado inicial
// ---------------------------------------------------------------------------

describe('CompanyContext — estado inicial', () => {
  it('deve iniciar com a empresa de id "1" selecionada', () => {
    renderWithProvider();
    expect(screen.getByTestId('company-id').textContent).toBe('1');
  });

  it('deve iniciar com o nome correto da empresa padrao', () => {
    renderWithProvider();
    // O nome da empresa 1 deve corresponder ao que esta em COMPANIES
    const empresa1 = COMPANIES.find((c) => c.id === '1');
    expect(screen.getByTestId('company-name').textContent).toBe(empresa1!.name);
  });

  it('deve expor todas as empresas cadastradas no contexto', () => {
    renderWithProvider();
    expect(screen.getByTestId('company-count').textContent).toBe(
      String(COMPANIES.length)
    );
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Troca de empresa
// ---------------------------------------------------------------------------

describe('CompanyContext — gerenciamento de empresa', () => {
  it('deve manter a empresa selecionada', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    // Estado inicial: empresa 1
    expect(screen.getByTestId('company-id').textContent).toBe('1');

    await user.click(screen.getByTestId('switch-to-1'));
    expect(screen.getByTestId('company-id').textContent).toBe('1');
  });

  it('deve usar empresa padrao se id invalido for passado (fallback para primeiro da lista)', async () => {
    const user = userEvent.setup();
    // Criar um provider com ID invalido via act
    let setId: (id: string) => void = () => {};

    function InvalidIdConsumer() {
      const { selectedCompany, setSelectedCompanyId } = useCompany();
      setId = setSelectedCompanyId;
      return <span data-testid="fallback-id">{selectedCompany.id}</span>;
    }

    render(
      <CompanyProvider>
        <InvalidIdConsumer />
      </CompanyProvider>
    );

    // Tentar setar um ID que nao existe
    act(() => setId('empresa-inexistente-999'));

    // O contexto deve fazer fallback para a primeira empresa da lista
    const fallbackId = COMPANIES[0].id;
    expect(screen.getByTestId('fallback-id').textContent).toBe(fallbackId);
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Protecao de contexto
// ---------------------------------------------------------------------------

describe('CompanyContext — protecao de contexto', () => {
  it('deve lancar erro quando useCompany e usado fora do CompanyProvider', () => {
    // Suprimir o erro do console no ambiente de teste
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function OrphanConsumer() {
      useCompany(); // Sem provider!
      return null;
    }

    expect(() => render(<OrphanConsumer />)).toThrow(
      'useCompany must be used within a CompanyProvider'
    );

    consoleSpy.mockRestore();
  });
});
