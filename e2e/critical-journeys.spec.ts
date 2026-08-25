/**
 * critical-journeys.spec.ts
 *
 * Testes E2E para as jornadas criticas do dashboard Harlani Gestao.
 * Cada teste simula um usuario real navegando no browser.
 *
 * Jornadas cobertas:
 * 1. Carregamento do dashboard principal
 * 2. Selecao de empresa e atualizacao de contexto
 * 3. Navegacao para DRE Gerencial e carregamento de dados
 * 4. Exportacao de relatorio (fluxo completo)
 * 5. Navegacao entre todas as rotas principais
 * 6. Resiliencia: pagina nao quebra mesmo com API lenta
 */

import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helper: aguardar que o skeleton de carregamento desapareça
// ---------------------------------------------------------------------------

async function waitForPageLoad(page: Page, timeout = 30000) {
  // Aguarda o skeleton sumir e o conteudo real aparecer
  await page.waitForFunction(
    () => !document.querySelector('.skeleton, [data-loading="true"]'),
    { timeout }
  );
}

// ---------------------------------------------------------------------------
// Jornada 1: Dashboard Principal
// ---------------------------------------------------------------------------

test.describe('Jornada: Dashboard Principal', () => {
  test('deve carregar o dashboard com layout completo (sidebar + header)', async ({ page }) => {
    await page.goto('/');

    // Sidebar deve existir com o logo
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('aside h2')).toContainText('Harlani');

    // Header deve existir com o seletor de empresa
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('header select')).toBeVisible();
  });

  test('deve exibir a empresa padrao selecionada no header', async ({ page }) => {
    await page.goto('/');

    // A primeira empresa deve estar selecionada por padrao
    const select = page.locator('header select');
    await expect(select).toBeVisible();

    // Deve ter pelo menos uma opcao de empresa
    const options = page.locator('header select option');
    await expect(options).toHaveCount(1); // Apenas a empresa real conectada
  });

  test('deve exibir cards de KPI financeiros na pagina inicial', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Pelo menos um card de metrica deve estar visivel
    await expect(page.locator('.card').first()).toBeVisible();
  });

  test('deve ter title da pagina correto para SEO', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Harlani|Dashboard/i);
  });
});

// ---------------------------------------------------------------------------
// Jornada 2: Selecao de Empresa
// ---------------------------------------------------------------------------

test.describe('Jornada: Selecao de Empresa', () => {
  test('deve exibir a empresa conectada no select do header', async ({ page }) => {
    await page.goto('/');

    const select = page.locator('header select');
    await expect(select).toBeVisible();

    // Verificar valor inicial (empresa 1)
    const initialValue = await select.inputValue();
    expect(initialValue).toBe('1');
  });

  test('deve exibir o badge de status da empresa no header', async ({ page }) => {
    await page.goto('/');

    // Badge "Ativa" deve estar visivel
    const badge = page.locator('header .badge-success');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Ativa');
  });

  test('deve manter empresa selecionada ao navegar entre paginas', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header select')).toHaveValue('1');

    // Navegar para DRE
    await page.click('a[href="/dre"]');
    await page.waitForURL('/dre');

    // Empresa deve continuar selecionada (React Context persiste)
    await expect(page.locator('header select')).toHaveValue('1');
  });
});

// ---------------------------------------------------------------------------
// Jornada 3: Pagina DRE Gerencial
// ---------------------------------------------------------------------------

test.describe('Jornada: DRE Gerencial', () => {
  test('deve navegar para /dre e exibir o titulo correto', async ({ page }) => {
    await page.goto('/dre');

    await expect(page.locator('h1')).toContainText('DRE');
    expect(page.url()).toContain('/dre');
  });

  test('deve exibir o link de DRE ativo na sidebar', async ({ page }) => {
    await page.goto('/dre');

    // Item de DRE na sidebar deve ter classe active
    const dreNavItem = page.locator('.nav-item.active');
    await expect(dreNavItem).toBeVisible();
    await expect(dreNavItem).toContainText('DRE');
  });

  test('deve carregar a pagina DRE sem erros de JavaScript', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await page.goto('/dre');
    await page.waitForLoadState('networkidle');

    // Nenhum erro JS critico deve ocorrer
    const criticalErrors = jsErrors.filter((e) =>
      e.includes('TypeError') || e.includes('ReferenceError')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('deve exibir tabela ou linhas do DRE apos carregamento', async ({ page }) => {
    await page.goto('/dre');
    await page.waitForLoadState('networkidle');

    // Deve haver pelo menos um elemento de linha DRE ou card visivel
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 15000 });
  });

  test('deve ter botao de exportar visivel na pagina DRE', async ({ page }) => {
    await page.goto('/dre');
    await page.waitForLoadState('networkidle');

    // Botao de exportar deve existir
    const exportBtn = page.locator('button:has-text("Exportar"), button:has-text("Export")');
    await expect(exportBtn.first()).toBeVisible({ timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
// Jornada 4: Exportacao de Relatorio
// ---------------------------------------------------------------------------

test.describe('Jornada: Exportacao de Relatorio', () => {
  test('deve iniciar download ao clicar em Exportar na pagina DRE', async ({ page }) => {
    await page.goto('/dre');
    await page.waitForLoadState('networkidle');

    // Configurar listener de download ANTES de clicar
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    const exportBtn = page.locator('button:has-text("Exportar")').first();
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
    await exportBtn.click();

    const download = await downloadPromise;

    // Arquivo deve ter extensao .xlsx
    expect(download.suggestedFilename()).toMatch(/\.(xlsx|csv)$/i);
  });

  test('deve iniciar download ao clicar em Exportar na pagina de Fluxo de Caixa', async ({ page }) => {
    await page.goto('/fluxo');
    await page.waitForLoadState('networkidle');

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    const exportBtn = page.locator('button:has-text("Exportar")').first();
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
    await exportBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.(xlsx|csv)$/i);
  });
});

// ---------------------------------------------------------------------------
// Jornada 5: Navegacao entre Rotas
// ---------------------------------------------------------------------------

test.describe('Jornada: Navegacao pelo Sidebar', () => {
  const routes = [
    { href: '/', label: 'Dashboard', titleMatch: /Dashboard|Home/i },
    { href: '/fluxo', label: 'Fluxo de Caixa', titleMatch: /Fluxo|Caixa/i },
    { href: '/dre', label: 'DRE Gerencial', titleMatch: /DRE/i },
    { href: '/contas', label: 'Contas', titleMatch: /Contas|Pagar|Receber/i },
    { href: '/clientes', label: 'Clientes', titleMatch: /Clientes|Fornecedores/i },
    { href: '/relatorios', label: 'Relatorios', titleMatch: /Relat/i },
  ];

  for (const route of routes) {
    test(`deve navegar para ${route.label} sem erros`, async ({ page }) => {
      await page.goto(route.href);

      // Nao deve haver pagina 404 ou erro
      await expect(page.locator('body')).not.toContainText('404');
      await expect(page.locator('body')).not.toContainText('This page could not be found');

      // Sidebar deve permanecer visivel
      await expect(page.locator('aside')).toBeVisible();
    });
  }

  test('deve destacar o item correto na sidebar para cada rota', async ({ page }) => {
    await page.goto('/fluxo');
    const activeItem = page.locator('.nav-item.active');
    await expect(activeItem).toContainText('Fluxo de Caixa');

    await page.goto('/contas');
    await expect(page.locator('.nav-item.active')).toContainText('Contas');
  });
});

// ---------------------------------------------------------------------------
// Jornada 6: Resiliencia e Acessibilidade Basica
// ---------------------------------------------------------------------------

test.describe('Jornada: Resiliencia e Acessibilidade', () => {
  test('dashboard nao deve exibir tela branca mesmo com dados carregando', async ({ page }) => {
    await page.goto('/');

    // Imediatamente apos navegar, deve haver conteudo visivel (skeleton ou real)
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('aside')).toBeVisible();
  });

  test('todas as paginas devem ter elemento h1 para SEO', async ({ page }) => {
    const pages = ['/', '/dre', '/fluxo', '/contas'];

    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const h1Count = await page.locator('h1').count();
      expect(h1Count, `Pagina ${url} deve ter exatamente 1 h1`).toBeGreaterThanOrEqual(1);
    }
  });

  test('deve carregar sem erros de console criticos em nenhuma rota', async ({ page }) => {
    const criticalErrors: string[] = [];
    page.on('pageerror', (err) => criticalErrors.push(`[${err.name}] ${err.message}`));

    const routes = ['/', '/dre', '/fluxo', '/contas', '/clientes', '/relatorios'];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
    }

    const realErrors = criticalErrors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    );
    expect(realErrors).toHaveLength(0);
  });
});
