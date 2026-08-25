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

interface CashFlowBarChartProps {
  readonly data: readonly any[];
  readonly height?: number;
}

export function CashFlowBarChart({ data, height = 320 }: Readonly<CashFlowBarChartProps>) {
  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }} 
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
            tick={{ fill: '#3b82f6', fontSize: 12 }} 
            tickFormatter={(v) => `R$${v / 1000}k`} 
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0', 
              boxShadow: 'var(--shadow-lg)',
              backgroundColor: '#ffffff'
            }}
            formatter={(val: any, name: any) => [
              `R$ ${Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
              String(name)
            ]}
          />
          <Legend wrapperStyle={{ paddingTop: '15px' }} />
          
          <Bar 
            yAxisId="left" 
            dataKey="entradas" 
            name="Entradas (+)" 
            fill="var(--secondary)" 
            radius={[4, 4, 0, 0]} 
            barSize={20} 
          />
          <Bar 
            yAxisId="left" 
            dataKey="saidas" 
            name="Saídas (-)" 
            fill="var(--danger)" 
            radius={[4, 4, 0, 0]} 
            barSize={20} 
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="saldoAcumulado" 
            name="Saldo Acumulado" 
            stroke="var(--primary)" 
            strokeWidth={3} 
            dot={{ r: 4 }} 
            activeDot={{ r: 6 }} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
