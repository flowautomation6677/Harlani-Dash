import { redirect } from 'next/navigation';

// O proxy (src/proxy.ts) já garante que só chega aqui quem está autenticado —
// esta rota só existe para mandar a raiz do site direto para o dashboard.
export default function RootPage() {
  redirect('/dashboard');
}
