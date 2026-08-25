'use client';

import { 
  ComposedChart, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { BreakEvenAnalysis } from '@/lib/api/niboClient';

interface BreakEvenLineChartProps {
  readonly data: BreakEvenAnalysis['monthlyBreakdown'];
  readonly height?: number;
}

export function BreakEvenLineChart({ data, height = 300 }: Readonly<BreakEvenLineChartProps>) {
  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
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
            tick={{ fill: '#64748b', fontSize: 12 }} 
            tickFormatter={(v) => `R$${v / 1000}k`} 
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0', 
              boxShadow: 'var(--shadow-lg)',
              backgroundColor: '#ffffff'
            }}
            formatter={(value: any, name: any) => [
              `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              String(name)
            ]}
          />
          <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />

          <Area 
            type="monotone" 
            dataKey="faturamento" 
            name="Faturamento Real" 
            stroke="var(--secondary)" 
            strokeWidth={3} 
            fillOpacity={1} 
            fill="url(#colorFaturamento)" 
          />
          <Line 
            type="monotone" 
            dataKey="pontoEquilibrio" 
            name="Ponto de Equilíbrio (Meta Mínima)" 
            stroke="#f59e0b" 
            strokeWidth={3} 
            strokeDasharray="5 5" 
            dot={{ r: 4, fill: '#f59e0b' }} 
          />
          <Line 
            type="monotone" 
            dataKey="custosFixos" 
            name="Custos & Despesas Fixas" 
            stroke="var(--danger)" 
            strokeWidth={2} 
            dot={{ r: 3 }} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
