export interface Company {
  id: string;
  name: string;
  cnpj: string;
  segment: string;
  status: 'Ativa' | 'Pendente' | 'Em Análise';
}

export const COMPANIES: Company[] = [
  { id: '1', name: 'Sua Empresa (Dados Nibo)', cnpj: '12.345.678/0001-90', segment: 'Tecnologia & SaaS', status: 'Ativa' },
  { id: '2', name: 'Grupo Nexus Logística', cnpj: '98.765.432/0001-10', segment: 'Transporte & Carga', status: 'Ativa' },
  { id: '3', name: 'Inovare Varejo & Comércio', cnpj: '45.678.912/0001-33', segment: 'Varejo Multicanal', status: 'Ativa' }
];
