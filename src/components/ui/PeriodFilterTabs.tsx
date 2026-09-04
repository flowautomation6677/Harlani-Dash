'use client';

import { Calendar as CalendarIcon } from 'lucide-react';

export interface PeriodOption {
  value: string;
  label: string;
}

interface PeriodFilterTabsProps {
  readonly options: readonly PeriodOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Valor que ativa o range picker embutido (padrão: 'custom'). */
  readonly customValue?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly onStartDateChange?: (value: string) => void;
  readonly onEndDateChange?: (value: string) => void;
}

export function PeriodFilterTabs({
  options,
  value,
  onChange,
  customValue = 'custom',
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}: PeriodFilterTabsProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="tabs-container">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`tab-btn ${value === opt.value ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {value === customValue && onStartDateChange && onEndDateChange && (
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 px-3 rounded-lg border border-gray-200 animate-fade-in">
          <CalendarIcon size={16} className="text-primary" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="text-xs border-none bg-transparent font-semibold outline-none cursor-pointer"
          />
          <span className="text-xs text-muted">até</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="text-xs border-none bg-transparent font-semibold outline-none cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
