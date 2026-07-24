// Persistência real (Supabase, projeto ERP kkhxxsrgsewjfvnnssyf) para o CRM
// independente da Patrícia Canto. Tabelas novas, sem relação com as tabelas
// financeiras do AWQ. Guardam dado pessoal de cliente (nome/telefone/caso),
// então — ao contrário de financial_documents/bank_transactions — usamos
// SÓ a service role key (erpAdmin), nunca o fallback anon: a anon key é
// pública (hardcoded em lib/supabase.ts), e a service role já ignora RLS
// por padrão, então não precisa de GRANT/DISABLE RLS nenhum. Sem
// ERP_SUPABASE_SERVICE_ROLE_KEY configurado, essas rotas ficam indisponíveis
// (ver isDbConfigured) em vez de cair para um acesso mais aberto.
import { erpAdmin } from "@/lib/supabase";
import type { Lead, Stage, StageEvent, Channel, Priority } from "./leads";
import type { CaseItem, CaseStage, Resultado } from "./cases";
import type { Lancamento, TipoLancamento, StatusLancamento } from "./financeiro";

const db = erpAdmin;

export function isDbConfigured(): boolean {
  return !!db;
}

type Row = Record<string, unknown>;

function rowToLead(r: Row): Lead {
  return {
    id: r.id as string,
    tipoProcesso: r.tipo_processo as string,
    nomeCliente: r.nome_cliente as string,
    telefone: r.telefone as string,
    escritorio: (r.escritorio as string) ?? null,
    stage: r.stage as Stage,
    valorAcao: (r.valor_acao as number) ?? null,
    honorarios: (r.honorarios as number) ?? null,
    dataFechamento: (r.data_fechamento as string) ?? null,
    percChances: (r.perc_chances as number) ?? null,
    status: (r.status as string) ?? null,
    motivoPerda: (r.motivo_perda as string) ?? null,
    prioridade: (r.prioridade as Priority) ?? null,
    origem: (r.origem as Channel) ?? null,
    indicadoPor: (r.indicado_por as string) ?? null,
    descricao: (r.descricao as string) ?? null,
    dataEntrada: r.data_entrada as string,
    dataPrimeiroContato: (r.data_primeiro_contato as string) ?? null,
    stageHistory: (r.stage_history as StageEvent[]) ?? [],
  };
}

function leadToRow(l: Lead): Row {
  return {
    id: l.id,
    tipo_processo: l.tipoProcesso,
    nome_cliente: l.nomeCliente,
    telefone: l.telefone,
    escritorio: l.escritorio,
    stage: l.stage,
    valor_acao: l.valorAcao,
    honorarios: l.honorarios,
    data_fechamento: l.dataFechamento,
    perc_chances: l.percChances,
    status: l.status,
    motivo_perda: l.motivoPerda,
    prioridade: l.prioridade,
    origem: l.origem,
    indicado_por: l.indicadoPor,
    descricao: l.descricao,
    data_entrada: l.dataEntrada,
    data_primeiro_contato: l.dataPrimeiroContato,
    stage_history: l.stageHistory,
  };
}

function rowToCase(r: Row): CaseItem {
  return {
    id: r.id as string,
    leadId: (r.lead_id as string) ?? null,
    nomeCliente: r.nome_cliente as string,
    telefone: r.telefone as string,
    tipoProcesso: r.tipo_processo as string,
    stage: r.stage as CaseStage,
    documentosPendentes: (r.documentos_pendentes as string) ?? null,
    dataAberturaProcesso: (r.data_abertura_processo as string) ?? null,
    numeroProtocolo: (r.numero_protocolo as string) ?? null,
    statusInss: (r.status_inss as CaseItem["statusInss"]) ?? null,
    numeroProcessoJudicial: (r.numero_processo_judicial as string) ?? null,
    vara: (r.vara as string) ?? null,
    statusJudicial: (r.status_judicial as CaseItem["statusJudicial"]) ?? null,
    resultado: (r.resultado as Resultado) ?? null,
    recursoNecessario: (r.recurso_necessario as boolean) ?? null,
    dataDecisao: (r.data_decisao as string) ?? null,
    honorarioExitoRecebido: !!r.honorario_exito_recebido,
    pedidoIndicacaoEnviado: !!r.pedido_indicacao_enviado,
    depoimentoColetado: !!r.depoimento_coletado,
    dataUltimaAtualizacao: r.data_ultima_atualizacao as string,
    dataCriacao: r.data_criacao as string,
  };
}

function caseToRow(c: CaseItem): Row {
  return {
    id: c.id,
    lead_id: c.leadId,
    nome_cliente: c.nomeCliente,
    telefone: c.telefone,
    tipo_processo: c.tipoProcesso,
    stage: c.stage,
    documentos_pendentes: c.documentosPendentes,
    data_abertura_processo: c.dataAberturaProcesso,
    numero_protocolo: c.numeroProtocolo,
    status_inss: c.statusInss,
    numero_processo_judicial: c.numeroProcessoJudicial,
    vara: c.vara,
    status_judicial: c.statusJudicial,
    resultado: c.resultado,
    recurso_necessario: c.recursoNecessario,
    data_decisao: c.dataDecisao,
    honorario_exito_recebido: c.honorarioExitoRecebido,
    pedido_indicacao_enviado: c.pedidoIndicacaoEnviado,
    depoimento_coletado: c.depoimentoColetado,
    data_ultima_atualizacao: c.dataUltimaAtualizacao,
    data_criacao: c.dataCriacao,
  };
}

export async function getLeads(): Promise<Lead[]> {
  if (!db) throw new Error("Supabase não configurado (ERP_SUPABASE_SERVICE_ROLE_KEY ausente)");
  const { data, error } = await db.from("patricia_canto_leads").select("*").order("data_entrada", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(rowToLead);
}

export async function upsertLead(lead: Lead): Promise<void> {
  if (!db) throw new Error("Supabase não configurado");
  const { error } = await db.from("patricia_canto_leads").upsert(leadToRow(lead));
  if (error) throw error;
}

export async function deleteLead(id: string): Promise<void> {
  if (!db) throw new Error("Supabase não configurado");
  const { error } = await db.from("patricia_canto_leads").delete().eq("id", id);
  if (error) throw error;
}

export async function getCases(): Promise<CaseItem[]> {
  if (!db) throw new Error("Supabase não configurado");
  const { data, error } = await db.from("patricia_canto_cases").select("*").order("data_criacao", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(rowToCase);
}

export async function upsertCase(item: CaseItem): Promise<void> {
  if (!db) throw new Error("Supabase não configurado");
  const { error } = await db.from("patricia_canto_cases").upsert(caseToRow(item));
  if (error) throw error;
}

export async function deleteCase(id: string): Promise<void> {
  if (!db) throw new Error("Supabase não configurado");
  const { error } = await db.from("patricia_canto_cases").delete().eq("id", id);
  if (error) throw error;
}

function rowToLancamento(r: Row): Lancamento {
  return {
    id: r.id as string,
    tipo: r.tipo as TipoLancamento,
    leadId: (r.lead_id as string) ?? null,
    contraparte: r.contraparte as string,
    descricao: r.descricao as string,
    categoria: r.categoria as string,
    valor: r.valor as number,
    dataVencimento: r.data_vencimento as string,
    dataLiquidacao: (r.data_liquidacao as string) ?? null,
    status: r.status as StatusLancamento,
    observacao: (r.observacao as string) ?? null,
    dataCriacao: r.data_criacao as string,
  };
}

function lancamentoToRow(l: Lancamento): Row {
  return {
    id: l.id,
    tipo: l.tipo,
    lead_id: l.leadId,
    contraparte: l.contraparte,
    descricao: l.descricao,
    categoria: l.categoria,
    valor: l.valor,
    data_vencimento: l.dataVencimento,
    data_liquidacao: l.dataLiquidacao,
    status: l.status,
    observacao: l.observacao,
    data_criacao: l.dataCriacao,
  };
}

export async function getLancamentos(): Promise<Lancamento[]> {
  if (!db) throw new Error("Supabase não configurado");
  const { data, error } = await db
    .from("patricia_canto_lancamentos")
    .select("*")
    .order("data_vencimento", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(rowToLancamento);
}

export async function upsertLancamento(item: Lancamento): Promise<void> {
  if (!db) throw new Error("Supabase não configurado");
  const { error } = await db.from("patricia_canto_lancamentos").upsert(lancamentoToRow(item));
  if (error) throw error;
}

export async function deleteLancamento(id: string): Promise<void> {
  if (!db) throw new Error("Supabase não configurado");
  const { error } = await db.from("patricia_canto_lancamentos").delete().eq("id", id);
  if (error) throw error;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  if (!db) return fallback;
  const { data, error } = await db.from("patricia_canto_settings").select("value").eq("key", key).limit(1).maybeSingle();
  if (error || !data) return fallback;
  return (data.value as T) ?? fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  if (!db) throw new Error("Supabase não configurado");
  const { error } = await db.from("patricia_canto_settings").upsert({ key, value });
  if (error) throw error;
}
