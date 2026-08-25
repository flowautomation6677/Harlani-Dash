import { NextRequest, NextResponse } from 'next/server';

const NIBO_API_URL = process.env.NIBO_API_URL || 'https://api.nibo.com.br/empresas/v1';
const NIBO_API_TOKEN = process.env.NIBO_API_TOKEN;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!NIBO_API_TOKEN || NIBO_API_TOKEN === 'COLE_SEU_TOKEN_AQUI') {
    return NextResponse.json({ error: 'Nibo API Token not configured.' }, { status: 500 });
  }

  const { path } = await params;
  const endpoint = path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const query = searchParams ? `?${searchParams}` : '';
  
  const targetUrl = `${NIBO_API_URL}/${endpoint}${query}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'apitoken': NIBO_API_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error proxying to Nibo API:', error);
    return NextResponse.json({ error: 'Internal Server Error fetching Nibo Data' }, { status: 500 });
  }
}
