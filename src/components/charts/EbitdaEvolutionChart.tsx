'use client';

import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { EbitdaMonthlyItem } from '@/lib/api/niboClient';

interface EbitdaEvolutionChartProps {
  data: EbitdaMonthlyItem[];
  height?: number;
}

export function EbitdaEvolutionChart({ data, height = 300 }: EbitdaEvolutionChartProps) {
  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
          />
          <YAxis 
            yAxisId="left" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }} 
            tickFormatter={(v) => `R$${v / 1000}k`} 
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#8b5cf6', fontSize: 12 }} 
            tickFormatter={(v) => `${v.toFixed(0)}%`} 
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0', 
              boxShadow: 'var(--shadow-lg)',
              backgroundColor: '#ffffff'
            }}
            formatter={(value: any, name: any) => {
              const num = Number(value || 0);
              if (String(name).includes('%') || String(name).includes('Margem')) {
                return [`${num.toFixed(1)}%`, String(name)];
              }
              return [`R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, String(name)];
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
          
          <Bar 
            yAxisId="left" 
            dataKey="ebitda" 
            name="EBITDA (LAJIDA)" 
            fill="var(--purple)" 
            radius={[6, 6, 0, 0]} 
            barSize={24} 
          />
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="receitaLiquida" 
            name="Receita Líquida" 
            stroke="var(--primary)" 
            strokeWidth={3} 
            dot={{ r: 4 }} 
            activeDot={{ r: 6 }} 
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="margemEbitda" 
            name="Margem EBITDA (%)" 
            stroke="#f59e0b" 
            strokeWidth={2} 
            strokeDasharray="4 4" 
            dot={{ r: 3 }} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
