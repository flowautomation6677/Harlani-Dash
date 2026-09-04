'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { AgingBucketItem } from '@/lib/api/niboClient';

interface AgingBucketChartProps {
  readonly data: readonly AgingBucketItem[];
  readonly height?: number;
}

function formatAxisValue(v: number): string {
  if (v === 0) return 'R$0';
  return v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v.toFixed(0)}`;
}

export function AgingBucketChart({ data, height = 280 }: Readonly<AgingBucketChartProps>) {
  // Com todas as faixas zeradas (empresa em dia), o domínio automático do
  // Recharts geraria ticks fracionários sem sentido (ex.: "R$0.004k") — força
  // um teto mínimo para manter o eixo legível nesse caso.
  const maxTotal = (data as AgingBucketItem[]).reduce(
    (max, item) => Math.max(max, item.faixa0a30 + item.faixa31a60 + item.faixa61a90 + item.faixa90mais),
    0
  );

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data as AgingBucketItem[]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            allowDecimals={false}
            domain={[0, maxTotal > 0 ? 'auto' : 10]}
            tickFormatter={formatAxisValue}
          />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-lg)' }}
            formatter={(value: any, name: any) => [`R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, String(name)]}
          />
          <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />

          <Bar dataKey="faixa0a30" name="0-30 dias" stackId="aging" fill="var(--warning)" radius={[0, 0, 0, 0]} barSize={32} />
          <Bar dataKey="faixa31a60" name="31-60 dias" stackId="aging" fill="#f97316" radius={[0, 0, 0, 0]} barSize={32} />
          <Bar dataKey="faixa61a90" name="61-90 dias" stackId="aging" fill="var(--danger)" radius={[0, 0, 0, 0]} barSize={32} />
          <Bar dataKey="faixa90mais" name="90+ dias" stackId="aging" fill="#991b1b" radius={[6, 6, 0, 0]} barSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
