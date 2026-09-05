export interface Company {
  id: string;
  name: string;
  cnpj: string;
  segment: string;
  status: 'Ativa' | 'Inativa' | 'Pendente' | 'Em Análise';
}
