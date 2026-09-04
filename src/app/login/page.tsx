'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { HarlaniLogo } from '@/components/brand/HarlaniLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || 'Não foi possível entrar.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-main)',
        padding: '1rem',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <HarlaniLogo variant="full" />
          <p className="text-sm text-muted" style={{ marginTop: '0.75rem' }}>
            Entre com sua conta para acessar o dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="email" className="text-sm font-semibold" style={{ display: 'block', marginBottom: '0.375rem' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-semibold" style={{ display: 'block', marginBottom: '0.375rem' }}>
              Senha
            </label>
            <input
              id="password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            <LogIn size={18} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
