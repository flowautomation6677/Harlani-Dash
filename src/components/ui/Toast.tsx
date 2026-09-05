'use client';

import { useCallback, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export interface ToastItem {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const AUTO_DISMISS_MS = 4000;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastItem['type'], message: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
    },
    [dismissToast]
  );

  return { toasts, showToast, dismissToast };
}

interface ToastContainerProps {
  readonly toasts: ToastItem[];
  readonly onDismiss: (id: number) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 200 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.75rem 1rem',
            minWidth: '280px',
            borderLeft: `3px solid ${t.type === 'success' ? 'var(--secondary)' : 'var(--danger)'}`,
          }}
        >
          {t.type === 'success' ? (
            <CheckCircle2 size={18} className="text-success" />
          ) : (
            <XCircle size={18} className="text-danger" />
          )}
          <span className="text-sm flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="btn text-muted"
            style={{ minHeight: 'auto', padding: '0.25rem' }}
            aria-label="Fechar notificação"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
