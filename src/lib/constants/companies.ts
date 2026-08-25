export interface Company {
  id: string;
  name: string;
  cnpj: string;
  segment: string;
  status: 'Ativa' | 'Pendente' | 'Em Análise';
}

export const COMPANIES: Company[] = [
  { id: '1', name: 'Sua Empresa (Dados Nibo)', cnpj: '12.345.678/0001-90', segment: 'Tecnologia & SaaS', status: 'Ativa' }
];
