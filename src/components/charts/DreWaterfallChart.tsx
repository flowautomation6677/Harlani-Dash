'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import { DREData } from '@/lib/api/niboClient';

export type WaterfallView = 'bpo' | 'cliente';

interface DreWaterfallChartProps {
  readonly dre: DREData;
  readonly view?: WaterfallView;
  readonly height?: number;
}

interface WaterfallStep {
  name: string;
  start: number;
  end: number;
  base: number;
  size: number;
  displayValue: number;
  isTotal: boolean;
  label: string;
}

function formatCurrency(value: number, signed = false): string {
  const abs = Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (value < 0) return `- R$ ${abs}`;
  if (value > 0 && signed) return `+ R$ ${abs}`;
  return `R$ ${abs}`;
}

function buildSteps(dre: DREData, view: WaterfallView): WaterfallStep[] {
  const { receitaBruta, receitaLiquida, lucroBruto, ebitda, lucroLiquido } = dre;

  const raw =
    view === 'cliente'
      ? [
          { name: 'Receita', start: 0, end: receitaBruta, isTotal: true },
          { name: 'Custos e Despesas', start: receitaBruta, end: lucroLiquido, isTotal: false },
          { name: 'Lucro', start: 0, end: lucroLiquido, isTotal: true }
        ]
      : [
          { name: 'Receita Bruta', start: 0, end: receitaBruta, isTotal: true },
          { name: 'Deduções', start: receitaBruta, end: receitaLiquida, isTotal: false },
          { name: 'Receita Líquida', start: 0, end: receitaLiquida, isTotal: true },
          { name: 'CMV/CSP', start: receitaLiquida, end: lucroBruto, isTotal: false },
          { name: 'Lucro Bruto', start: 0, end: lucroBruto, isTotal: true },
          { name: 'Despesas Operacionais', start: lucroBruto, end: ebitda, isTotal: false },
          { name: 'EBITDA', start: 0, end: ebitda, isTotal: true },
          { name: 'Resultado Financeiro', start: ebitda, end: lucroLiquido, isTotal: false },
          { name: 'Lucro Líquido', start: 0, end: lucroLiquido, isTotal: true }
        ];

  return raw.map(step => {
    const base = Math.min(step.start, step.end);
    const size = Math.abs(step.end - step.start);
    const displayValue = step.isTotal ? step.end : step.end - step.start;
    return {
      ...step,
      base,
      size,
      displayValue,
      label: formatCurrency(displayValue, !step.isTotal)
    };
  });
}

function barColor(step: WaterfallStep): string {
  return step.displayValue >= 0 ? 'var(--secondary)' : 'var(--danger)';
}

export function DreWaterfallChart({ dre, view = 'bpo', height = 340 }: DreWaterfallChartProps) {
  const steps = buildSteps(dre, view);

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={steps} margin={{ top: 28, right: 10, left: 0, bottom: view === 'bpo' ? 40 : 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
            interval={0}
            angle={view === 'bpo' ? -20 : 0}
            textAnchor={view === 'bpo' ? 'end' : 'middle'}
            height={view === 'bpo' ? 60 : 30}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-lg)' }}
            formatter={(_value: any, _name: any, props: any) => {
              const step: WaterfallStep = props.payload;
              return [step.label, step.isTotal ? 'Resultado acumulado' : 'Variação'];
            }}
          />
          <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="size" stackId="waterfall" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {steps.map((step) => (
              <Cell key={step.name} fill={barColor(step)} />
            ))}
            <LabelList dataKey="label" position="top" style={{ fontSize: 11, fontWeight: 600, fill: '#334155' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
