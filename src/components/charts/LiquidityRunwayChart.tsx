'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { LiquidityRunwayPoint } from '@/lib/api/niboClient';

interface LiquidityRunwayChartProps {
  readonly data: readonly LiquidityRunwayPoint[];
  readonly height?: number;
}

function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

export function LiquidityRunwayChart({ data, height = 280 }: Readonly<LiquidityRunwayChartProps>) {
  const chartData = (data as LiquidityRunwayPoint[]).map(p => ({ ...p, label: formatShortDate(p.date) }));
  const hasNegative = chartData.some(p => p.saldoProjetado < 0);

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRunway" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 11 }}
            interval={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={(v) => `R$${v / 1000}k`}
          />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-lg)' }}
            formatter={(value: any) => [`R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Saldo projetado']}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.date ?? label}
          />
          {hasNegative && <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="4 4" label={{ value: 'Zona de risco', fill: 'var(--danger)', fontSize: 11, position: 'insideBottomLeft' }} />}
          <Area type="monotone" dataKey="saldoProjetado" name="Saldo Projetado" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRunway)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
