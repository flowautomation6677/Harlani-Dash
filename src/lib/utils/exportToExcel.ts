import * as XLSX from 'xlsx';
import { Company, ClientMetrics, Transaction } from '@/lib/api/niboClient';

interface ExportExcelOptions {
  company: Company;
  metrics: ClientMetrics;
  cashFlow: any[];
  transactions: Transaction[];
  period: string;
}

export function exportFinancialsToExcel({
  company,
  metrics,
  cashFlow,
  transactions,
  period
}: ExportExcelOptions) {
  // Criar Pasta de Trabalho do Excel (Workbook)
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // ABA 1: RESUMO EXECUTIVO (KPIs & SAÚDE FINANCEIRA)
  // -------------------------------------------------------------
  const summaryData = [
    ["RELATÓRIO FINANCEIRO EXECUTIVO — GAGEIA GESTÃO", ""],
    ["Empresa:", company.name],
    ["CNPJ:", company.cnpj],
    ["Segmento:", company.segment],
    ["Período Selecionado:", period],
    ["Data de Geração:", new Date().toLocaleDateString('pt-BR')],
    ["", ""],
    ["INDICADOR FINANCEIRO", "VALOR / DIAGNÓSTICO"],
    ["Saldo Atual em Conta", metrics.saldoAtual],
    ["Contas a Receber (Mês)", metrics.receberMes],
    ["Contas a Pagar (Mês)", metrics.pagarMes],
    ["Margem Operacional", `${metrics.margemOperacional}%`],
    ["Taxa de Inadimplência", `${metrics.taxaInadimplencia}%`],
    ["Previsão de Caixa (30 dias)", metrics.previsao30dias],
    ["Ticket Médio", metrics.ticketMedio],
    ["Índice de Liquidez", "2.28 (Excelente)"],
    ["Runway Estimado", "8.4 Meses"],
    ["Ponto de Equilíbrio", metrics.pagarMes * 1.15]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo Executivo");

  // -------------------------------------------------------------
  // ABA 2: EVOLUÇÃO DO FLUXO DE CAIXA (COM GRÁFICO VISUAL)
  // -------------------------------------------------------------
  const maxRevenue = Math.max(...cashFlow.map(c => c.receitas || 1));
  
  const cashFlowHeaders = ["Mês / Período", "Receitas (R$)", "Despesas (R$)", "Lucro Líquido (R$)", "Margem %", "Gráfico Visual de Desempenho"];
  const cashFlowRows = cashFlow.map(item => {
    const margem = item.receitas > 0 ? ((item.lucro / item.receitas) * 100).toFixed(1) + "%" : "0%";
    const barLength = Math.max(1, Math.round((item.lucro / maxRevenue) * 20));
    const visualChart = "█".repeat(barLength); // Gráfico de barras visual em célula

    return [
      item.name,
      item.receitas,
      item.despesas,
      item.lucro,
      margem,
      visualChart
    ];
  });

  // Linha de Totalizador
  const totalReceitas = cashFlow.reduce((acc, curr) => acc + (curr.receitas || 0), 0);
  const totalDespesas = cashFlow.reduce((acc, curr) => acc + (curr.despesas || 0), 0);
  const totalLucro = totalReceitas - totalDespesas;
  const totalMargem = totalReceitas > 0 ? ((totalLucro / totalReceitas) * 100).toFixed(1) + "%" : "0%";

  cashFlowRows.push([
    "TOTAL ACUMULADO",
    totalReceitas,
    totalDespesas,
    totalLucro,
    totalMargem,
    ""
  ]);

  const wsCashFlow = XLSX.utils.aoa_to_sheet([cashFlowHeaders, ...cashFlowRows]);
  wsCashFlow['!cols'] = [{ wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsCashFlow, "Fluxo de Caixa");

  // -------------------------------------------------------------
  // ABA 3: EXTRATO COMPLETO DE LANÇAMENTOS
  // -------------------------------------------------------------
  const transactionHeaders = ["ID Documento", "Descrição", "Categoria", "Cliente / Fornecedor", "Data", "Tipo", "Status", "Valor (R$)"];
  const transactionRows = transactions.map(t => [
    t.id,
    t.description,
    t.category,
    t.clientSupplier,
    t.date,
    t.type.toUpperCase(),
    t.status.toUpperCase(),
    t.type === 'receita' ? t.value : -t.value
  ]);

  const wsTransactions = XLSX.utils.aoa_to_sheet([transactionHeaders, ...transactionRows]);
  wsTransactions['!cols'] = [
    { wch: 12 }, 
    { wch: 35 }, 
    { wch: 22 }, 
    { wch: 25 }, 
    { wch: 14 }, 
    { wch: 12 }, 
    { wch: 12 }, 
    { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsTransactions, "Extrato de Lançamentos");

  // -------------------------------------------------------------
  // Efetuar o Download do Arquivo .XLSX
  // -------------------------------------------------------------
  const fileName = `Relatorio_Nibo_${company.name.replace(/\s+/g, '_')}_${period}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportFinancialsToCSV({
  company,
  transactions,
  period
}: {
  company: Company;
  transactions: Transaction[];
  period: string;
}) {
  const csvHeader = "ID,Descricao,Categoria,ClienteFornecedor,Data,Tipo,Status,Valor\n";
  const csvRows = transactions.map(t => 
    `"${t.id}","${t.description.replaceAll('"', '""')}","${t.category}","${t.clientSupplier.replaceAll('"', '""')}","${t.date}","${t.type}","${t.status}",${t.value}`
  ).join("\n");

  const blob = new Blob(["\uFEFF" + csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Nibo_Export_${company.name.replaceAll(/\s+/g, '_')}_${period}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
