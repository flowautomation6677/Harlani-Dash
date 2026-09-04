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
  isEmpty: boolean;
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

  const steps = raw.map(step => {
    const base = Math.min(step.start, step.end);
    const size = Math.abs(step.end - step.start);
    const displayValue = step.isTotal ? step.end : step.end - step.start;
    return {
      ...step,
      base,
      size,
      displayValue,
      isEmpty: size === 0,
      label: formatCurrency(displayValue, !step.isTotal)
    };
  });

  // Uma categoria sem nenhum lançamento no período (ex.: início do mês, antes
  // da receita ser lançada em lote) chega aqui como size === 0 — uma barra de
  // altura zero, invisível, que também comprime o eixo Y em torno do resíduo
  // das demais categorias. Em vez disso, desenhamos um retângulo hachurado de
  // altura mínima (proporcional à maior barra real do gráfico), deixando
  // claro que é "sem dado" e não um resultado negativo real do tamanho do
  // custo total.
  const maxSize = Math.max(...steps.map(s => s.size), 0);
  const placeholderSize = maxSize > 0 ? maxSize * 0.05 : 1;

  return steps.map(step => step.isEmpty
    ? { ...step, size: placeholderSize, label: 'Sem lançamentos' }
    : step);
}

function barColor(step: WaterfallStep): string {
  if (step.isEmpty) return 'url(#emptyHatch)';
  return step.displayValue >= 0 ? 'var(--secondary)' : 'var(--danger)';
}

export function DreWaterfallChart({ dre, view = 'bpo', height = 340 }: DreWaterfallChartProps) {
  const steps = buildSteps(dre, view);

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={steps} margin={{ top: 28, right: 10, left: 0, bottom: view === 'bpo' ? 40 : 10 }}>
          <defs>
            <pattern id="emptyHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#f1f5f9" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#cbd5e1" strokeWidth="2" />
            </pattern>
          </defs>
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
              if (step.isEmpty) return ['Sem lançamentos neste período', ''];
              return [step.label, step.isTotal ? 'Resultado acumulado' : 'Variação'];
            }}
          />
          <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="size" stackId="waterfall" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {steps.map((step) => (
              <Cell key={step.name} fill={barColor(step)} />
            ))}
            <LabelList
              dataKey="label"
              position="top"
              content={(props: any) => {
                const { x, y, width, value, index } = props;
                const step = steps[index];
                return (
                  <text
                    x={Number(x) + Number(width) / 2}
                    y={Number(y) - 6}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={step?.isEmpty ? 500 : 600}
                    fill={step?.isEmpty ? '#94a3b8' : '#334155'}
                    fontStyle={step?.isEmpty ? 'italic' : 'normal'}
                  >
                    {value}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
