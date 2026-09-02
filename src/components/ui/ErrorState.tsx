'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center gap-4 bg-white p-12 rounded-xl border border-gray-200 shadow-sm text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-danger">
        <AlertTriangle size={26} />
      </div>
      <div>
        <h3 className="font-bold text-lg">Não foi possível carregar dados reais do Nibo</h3>
        <p className="text-xs text-muted mt-1 max-w-md">
          {message || 'A API do Nibo não respondeu. Verifique o token configurado e a conexão, e tente novamente.'}
        </p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-outline gap-2 text-xs">
          <RotateCw size={14} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
