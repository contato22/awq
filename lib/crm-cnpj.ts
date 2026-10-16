// Tipo do lookup de CNPJ. Fica fora de app/api para o export estático
// (GitHub Pages) poder omitir os route handlers sem quebrar o typecheck
// das telas de CRM.

export type CnpjData = {
  // Identidade
  account_name: string;          // razao_social (UPPERCASE — formato legal RF)
  trade_name: string | null;     // nome_fantasia
  document_number: string;       // CNPJ formatado
  // Classificação
  industry: string | null;
  cnae_descricao: string | null;
  cnaes_secundarios: Array<{ codigo: number; descricao: string }>;
  company_size: string | null;
  descricao_porte: string | null;
  natureza_juridica: string | null;
  // Financeiro
  annual_revenue_estimate: number | null;
  capital_social: number | null;
  opcao_pelo_simples: boolean;
  opcao_pelo_mei: boolean;
  // Endereço
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  // Contato
  phone: string | null;
  phone2: string | null;
  email: string | null;
  // Cadastral
  situacao: string | null;
  data_situacao: string | null;
  data_abertura: string | null;
  // Sócios
  socios: Array<{ nome: string; cargo: string; qual: string }>;
};
