// Dados extraídos da planilha "CRM - PATRICIA CANTO" (Google Sheets, aba "Oportunidades").
// Fonte: https://docs.google.com/spreadsheets/d/11Xc9yCvtE7GYOkQCXsXCytuAdYS1ol0OEuUu5_ka3bc

export type Stage =
  | "novo"
  | "qualificado"
  | "proposta"
  | "negociacao"
  | "ganho"
  | "perdido";

export type Priority = "Alta" | "Média" | "Baixa";

export interface Lead {
  id: string;
  tipoProcesso: string;
  nomeCliente: string;
  telefone: string;
  escritorio: string | null;
  stage: Stage;
  valorAcao: number | null;
  honorarios: number | null;
  dataFechamento: string | null;
  percChances: number | null;
  status: string | null;
  motivoPerda: string | null;
  prioridade: Priority | null;
  origem: string | null;
  descricao: string | null;
}

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "novo", label: "Novo Lead", hint: "Contato recebido, ainda não qualificado" },
  { id: "qualificado", label: "Qualificado", hint: "Elegibilidade confirmada, caso viável" },
  { id: "proposta", label: "Proposta Enviada", hint: "Honorários e contrato enviados" },
  { id: "negociacao", label: "Em Negociação", hint: "Cliente avaliando / ajustando termos" },
  { id: "ganho", label: "Fechado — Ganho", hint: "Contrato assinado" },
  { id: "perdido", label: "Perdido", hint: "Cliente desistiu ou caso inviável" },
];

export const RAW_LEADS: Array<Omit<Lead, "id" | "stage"> & { stage?: Stage }> = [
  {
    tipoProcesso: "BPC LOAS FILHO",
    nomeCliente: "BRUNA DA SILVA RODRIGUES",
    telefone: "21 97487-6941",
    escritorio: "ozerflex",
    stage: "qualificado",
    valorAcao: null, honorarios: null,
    dataFechamento: null,
    percChances: 0.3,
    status: "Aberto",
    motivoPerda: "Nenhum",
    prioridade: "Alta",
    origem: "Anúncio",
    descricao: null,
  },
  { tipoProcesso: "AUX. DOENÇA", nomeCliente: "INGRID MELO", telefone: "32 99132-9448", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "APOSENTADORIA POR INVALIDEZ", nomeCliente: "SOLANGE PEREIRA DA SILVA", telefone: "21 96884-0830", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "BPC LOAS", nomeCliente: "MONICA ABRREU", telefone: "22 98140-6966", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "APOSENTADORIA PAI", nomeCliente: "GUSTAVO DANTAS", telefone: "21 99894-0672", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "AUX. DOENÇA", nomeCliente: "OSMAR BRANCO", telefone: "24 98180-8141", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "APOSENTADORIA", nomeCliente: "PASTOR JOÃO KAIRÓS", telefone: "21 97579-6767", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "BPC LOAS", nomeCliente: "PAMELLA NUTRI", telefone: "21 99863-7702", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "APOSENTADORA DA MÃE", nomeCliente: "FABIA NILA", telefone: "21 99736-9448", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "AUX. DOENÇA", nomeCliente: "THAYANA MIRANDA", telefone: "21 96496-4950", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "AUX. DOENÇA", nomeCliente: "MALVINA PEIXOTO", telefone: "21 97393-0824", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "APOSENTADORIA POR INVALIDEZ", nomeCliente: "RICARDO JOSÉ DE DEUS", telefone: "21 96839-6079", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "APOSENTADORIA POR IDADE", nomeCliente: "JESUÉ HORÁCIO", telefone: "21 97652-1880", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "DIVORCIO EXTRAJUDICIAL", nomeCliente: "LUCAS FEIJÓ", telefone: "21 96818-3252", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "DIVORCIO JUDICIAL", nomeCliente: "NELIANE DE PAULA MILAGRES", telefone: "21 99477-9653", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "APOSENTADORIA INVALIDEZ", nomeCliente: "DANIELLE WAROL", telefone: "21 99758-6014", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "BPC OU APOSENTADORIA", nomeCliente: "ELIETH BRANCO DA CUNHA", telefone: "24 99280-5067", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "BPC E OUTROS", nomeCliente: "CLENILDA", telefone: "21 97596-7403", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "APOSENTADORIA POR IDADE", nomeCliente: "ALEXANDRE BRAGA", telefone: "21 98908-5969", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "APOSENTADORIA", nomeCliente: "ANDREA FERREIRA", telefone: "21 99252-5228", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "AUX. MATERNIDADE", nomeCliente: "BRENDA RIBEIRO DE ABREU", telefone: "21 99324-7765", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "APOSENTADORIA POR INVALIDEZ", nomeCliente: "GERSON XAVIER", telefone: "21 97018-4559", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "APOSENTADORIA POR INVALIDEZ", nomeCliente: "AMANDA", telefone: "24 99222-1538", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "AUX. DOENÇA", nomeCliente: "SONIA MARIA DE CARVALHO DIAS", telefone: "21 99394-6671", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "DIVORCIO", nomeCliente: "CINTIA SOARES CHERMAUT", telefone: "21 99092-7631", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "APOSENTADORIA RURAL", nomeCliente: "SANDRA MAE DA BRUNA", telefone: "21 99204-0380", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "PLANEJAMENTO PREVIDENCIARIO", nomeCliente: "MARCELA DE TONY", telefone: "21", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "APOSENTADORIA MÃE", nomeCliente: "ANYARA", telefone: "21 96809-1358", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "AUX. DOENÇA", nomeCliente: "REGINA CÉLIA", telefone: "21 97586-5109", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "PENSÃO POR MORTE", nomeCliente: "EDEVLVIRA CORGUINHA", telefone: "21 99405-3376", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "APOSENTADORIA ESPOSO", nomeCliente: "IRANI", telefone: "21 99272-5358", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "APOSENTADORIA POR INVALIDEZ", nomeCliente: "SILEI DE OLIVEIRA QUIMAS", telefone: "21 99181-4114", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
  { tipoProcesso: "CÁLCULO APOSENTADORIA", nomeCliente: "SANDRA", telefone: "21 99906-2426", escritorio: null, valorAcao: null, honorarios: null, dataFechamento: null, percChances: null, status: null, motivoPerda: null, prioridade: null, origem: null, descricao: null },
];

export function buildInitialLeads(): Lead[] {
  return RAW_LEADS.map((raw, i) => ({
    id: `pc-${i + 1}`,
    stage: raw.stage ?? "novo",
    ...raw,
  }));
}
