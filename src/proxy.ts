import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/getSession';

// Next.js 16 renomeou middleware.ts -> proxy.ts (mesma funcionalidade).
// Proxy usa runtime Node.js por padrão nessa versão, então node:crypto
// (usado em getSession/session.ts) funciona normalmente aqui.
export function proxy(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Protege paginas, mas nao arquivos estaticos (qualquer caminho com "." —
  // logo-harlani.png, icon.png, favicon.ico, *.svg etc. — nunca tem extensao
  // uma rota de pagina real neste app). Sem isso o Next tenta buscar essas
  // imagens internamente (ex: otimizador de imagem) sem cookie de sessao,
  // cai no redirect e a imagem "quebra" na tela de login.
  // Rotas /api ficam de fora — cada uma valida a propria sessao (ja fazem isso).
  matcher: ['/((?!api|_next/static|_next/image|login|.*\\..*).*)'],
};
