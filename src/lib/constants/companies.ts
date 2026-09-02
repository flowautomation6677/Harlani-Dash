export interface Company {
  id: string;
  name: string;
  cnpj: string;
  segment: string;
  status: 'Ativa' | 'Pendente' | 'Em Análise';
}

const companyOneName = process.env.NEXT_PUBLIC_NIBO_CLIENT_1_NAME || 'Sua Empresa (Dados Nibo)';
const companyOneCnpj = process.env.NEXT_PUBLIC_NIBO_CLIENT_1_CNPJ || 'CNPJ pendente';
const companyTwoName = process.env.NEXT_PUBLIC_NIBO_CLIENT_2_NAME || 'Segunda Empresa (Dados Nibo)';
const companyTwoCnpj = process.env.NEXT_PUBLIC_NIBO_CLIENT_2_CNPJ || 'CNPJ pendente';

export const COMPANIES: Company[] = [
  { id: '1', name: companyOneName, cnpj: companyOneCnpj, segment: 'Tecnologia & SaaS', status: 'Ativa' },
  { id: '2', name: companyTwoName, cnpj: companyTwoCnpj, segment: 'Tecnologia & SaaS', status: 'Ativa' }
];
