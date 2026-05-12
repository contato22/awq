// ─── JACQES CRM — Database Layer (Supabase) ───────────────────────────────────
// Funciona em servidor (Vercel) e no browser (GitHub Pages estático).
// supabase é null quando as vars de ambiente não estão presentes.

import { supabase } from "@/lib/supabase";

// ─── Enumerações ──────────────────────────────────────────────────────────────

export const PIPELINE_STAGES = [
  "Novo Lead", "Qualificação", "Diagnóstico", "Proposta", "Negociação",
  "Fechado Ganho", "Fechado Perdido",
] as const;

export const INTERACTION_TYPES = [
  "Ligação", "Reunião", "Visita", "WhatsApp", "E-mail", "Follow-up",
  "Proposta Enviada", "Contraproposta", "Alinhamento Interno", "Observação de Risco",
] as const;

export const TASK_PRIORITIES  = ["Baixa", "Média", "Alta", "Crítica"] as const;
export const TASK_STATUSES    = ["Aberta", "Em Andamento", "Concluída", "Bloqueada", "Vencida"] as const;
export const LEAD_STATUSES    = ["Novo", "Qualificando", "Convertido", "Perdido", "Nurturing"] as const;
export const CLIENT_STATUSES  = ["Ativo", "Em Atenção", "Em Risco", "Churned", "Inativo"] as const;
export const EXPANSION_TYPES  = ["Upsell", "Cross-sell", "Upgrade", "Projeto Extra", "Reativação"] as const;
export const RISK_LEVELS      = ["Baixo", "Médio", "Alto"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type CrmLead = {
  id: string;
  nome: string;
  empresa: string;
  contato_principal: string;
  telefone: string;
  email: string;
  origem: string;
  segmento: string;
  canal: string;
  interesse: string;
  status: string;
  owner: string;
  data_entrada: string;
  observacoes: string;
};

export type CrmOpportunity = {
  id: string;
  lead_id: string | null;
  cliente_id: string | null;
  nome_oportunidade: string;
  empresa: string;
  segmento: string;
  produto: string;
  ticket_estimado: number;
  valor_potencial: number;
  stage: string;
  probabilidade: number;
  owner: string;
  data_abertura: string;
  proxima_acao: string;
  data_proxima_acao: string | null;
  risco: string;
  motivo_perda: string;
  data_fechamento_prevista: string | null;
  observacoes: string;
};

export type CrmProposal = {
  id: string;
  opportunity_id: string;
  versao: number;
  valor_proposto: number;
  escopo: string;
  status: string;
  data_envio: string | null;
  data_resposta: string | null;
  contraproposta: number | null;
  observacoes: string;
};

export type CrmClient = {
  id: string;
  nome: string;
  razao_social: string;
  cnpj: string;
  segmento: string;
  produto_ativo: string;
  ticket_mensal: number;
  inicio_relacao: string | null;
  owner: string;
  status_conta: string;
  health_score: number;
  churn_risk: string;
  potencial_expansao: number;
  observacoes: string;
};

export type CrmInteraction = {
  id: string;
  cliente_id: string | null;
  opportunity_id: string | null;
  lead_id: string | null;
  tipo: string;
  canal: string;
  data: string;
  resumo: string;
  proximo_passo: string;
  responsavel: string;
  satisfacao_percebida: string;
  risco_percebido: string;
};

export type CrmTask = {
  id: string;
  cliente_id: string | null;
  opportunity_id: string | null;
  lead_id: string | null;
  titulo: string;
  categoria: string;
  prioridade: string;
  status: string;
  responsavel: string;
  data_criacao: string;
  prazo: string | null;
  sla_horas: number;
  data_conclusao: string | null;
  bloqueio: string;
  retrabalho: boolean;
};

export type CrmVisit = {
  id: string;
  cliente_id: string;
  data: string;
  objetivo: string;
  resultado: string;
  proximo_passo: string;
  responsavel: string;
};

export type CrmExpansion = {
  id: string;
  cliente_id: string;
  tipo: string;
  valor_potencial: number;
  status: string;
  owner: string;
  proxima_acao: string;
  observacoes: string;
};

export type CrmHealthSnapshot = {
  id: string;
  cliente_id: string;
  periodo: string;
  health_score: number;
  churn_risk: string;
  ultima_interacao: string | null;
  followups_em_dia: boolean;
  pendencias: number;
  expansao_aberta: boolean;
};

// ─── Seed Data (fallback sem DB) ──────────────────────────────────────────────
export const SEED_CLIENTS: CrmClient[]           = [];
export const SEED_LEADS: CrmLead[]               = [];
export const SEED_OPPORTUNITIES: CrmOpportunity[]= [];
export const SEED_PROPOSALS: CrmProposal[]       = [];
export const SEED_TASKS: CrmTask[]               = [];
export const SEED_INTERACTIONS: CrmInteraction[] = [];
export const SEED_EXPANSION: CrmExpansion[]      = [];
export const SEED_HEALTH: CrmHealthSnapshot[]    = [];

// ─── Schema Bootstrap (no-op — schema gerenciado no Supabase Console) ─────────
export async function initCrmDB(): Promise<void> { /* no-op */ }

// ─── Helpers de coerção ───────────────────────────────────────────────────────

function coerceLead(r: Record<string, unknown>): CrmLead {
  return {
    id:                String(r.id ?? ""),
    nome:              String(r.nome ?? ""),
    empresa:           String(r.empresa ?? ""),
    contato_principal: String(r.contato_principal ?? ""),
    telefone:          String(r.telefone ?? ""),
    email:             String(r.email ?? ""),
    origem:            String(r.origem ?? ""),
    segmento:          String(r.segmento ?? ""),
    canal:             String(r.canal ?? ""),
    interesse:         String(r.interesse ?? ""),
    status:            String(r.status ?? "Novo"),
    owner:             String(r.owner ?? ""),
    data_entrada:      String(r.data_entrada ?? ""),
    observacoes:       String(r.observacoes ?? ""),
  };
}

function coerceOpportunity(r: Record<string, unknown>): CrmOpportunity {
  return {
    id:                       String(r.id ?? ""),
    lead_id:                  r.lead_id    != null ? String(r.lead_id)    : null,
    cliente_id:               r.cliente_id != null ? String(r.cliente_id) : null,
    nome_oportunidade:        String(r.nome_oportunidade ?? ""),
    empresa:                  String(r.empresa ?? ""),
    segmento:                 String(r.segmento ?? ""),
    produto:                  String(r.produto ?? ""),
    ticket_estimado:          Number(r.ticket_estimado ?? 0),
    valor_potencial:          Number(r.valor_potencial ?? 0),
    stage:                    String(r.stage ?? "Novo Lead"),
    probabilidade:            Number(r.probabilidade ?? 20),
    owner:                    String(r.owner ?? ""),
    data_abertura:            String(r.data_abertura ?? ""),
    proxima_acao:             String(r.proxima_acao ?? ""),
    data_proxima_acao:        r.data_proxima_acao != null ? String(r.data_proxima_acao) : null,
    risco:                    String(r.risco ?? "Baixo"),
    motivo_perda:             String(r.motivo_perda ?? ""),
    data_fechamento_prevista: r.data_fechamento_prevista != null ? String(r.data_fechamento_prevista) : null,
    observacoes:              String(r.observacoes ?? ""),
  };
}

function coerceTask(r: Record<string, unknown>): CrmTask {
  return {
    id:             String(r.id ?? ""),
    cliente_id:     r.cliente_id     != null ? String(r.cliente_id)     : null,
    opportunity_id: r.opportunity_id != null ? String(r.opportunity_id) : null,
    lead_id:        r.lead_id        != null ? String(r.lead_id)        : null,
    titulo:         String(r.titulo ?? ""),
    categoria:      String(r.categoria ?? ""),
    prioridade:     String(r.prioridade ?? "Média"),
    status:         String(r.status ?? "Aberta"),
    responsavel:    String(r.responsavel ?? ""),
    data_criacao:   String(r.data_criacao ?? ""),
    prazo:          r.prazo          != null ? String(r.prazo)          : null,
    sla_horas:      Number(r.sla_horas ?? 24),
    data_conclusao: r.data_conclusao != null ? String(r.data_conclusao) : null,
    bloqueio:       String(r.bloqueio ?? ""),
    retrabalho:     Boolean(r.retrabalho),
  };
}

// ─── CRUD — Leads ─────────────────────────────────────────────────────────────

export async function listLeads(): Promise<CrmLead[]> {
  if (!supabase) return SEED_LEADS;
  const { data, error } = await supabase
    .from("jacqes_crm_leads")
    .select("id,nome,empresa,contato_principal,telefone,email,origem,segmento,canal,interesse,status,owner,data_entrada,observacoes")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => coerceLead(r as Record<string, unknown>));
}

export async function createLead(data: Omit<CrmLead, "id">): Promise<CrmLead> {
  if (!supabase) throw new Error("DB unavailable");
  const { data: row, error } = await supabase
    .from("jacqes_crm_leads")
    .insert({
      nome:              data.nome,
      empresa:           data.empresa,
      contato_principal: data.contato_principal,
      telefone:          data.telefone,
      email:             data.email,
      origem:            data.origem,
      segmento:          data.segmento,
      canal:             data.canal,
      interesse:         data.interesse,
      status:            data.status,
      owner:             data.owner,
      data_entrada:      data.data_entrada,
      observacoes:       data.observacoes,
    })
    .select("id,nome,empresa,contato_principal,telefone,email,origem,segmento,canal,interesse,status,owner,data_entrada,observacoes")
    .single();
  if (error) throw error;
  return coerceLead(row as Record<string, unknown>);
}

// ─── CRUD — Opportunities ─────────────────────────────────────────────────────

export async function listOpportunities(): Promise<CrmOpportunity[]> {
  if (!supabase) return SEED_OPPORTUNITIES;
  const { data, error } = await supabase
    .from("jacqes_crm_opportunities")
    .select("id,lead_id,cliente_id,nome_oportunidade,empresa,segmento,produto,ticket_estimado,valor_potencial,stage,probabilidade,owner,data_abertura,proxima_acao,data_proxima_acao,risco,motivo_perda,data_fechamento_prevista,observacoes")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => coerceOpportunity(r as Record<string, unknown>));
}

export async function createOpportunity(data: Omit<CrmOpportunity, "id">): Promise<CrmOpportunity> {
  if (!supabase) throw new Error("DB unavailable");
  const { data: row, error } = await supabase
    .from("jacqes_crm_opportunities")
    .insert({
      lead_id:                  data.lead_id,
      cliente_id:               data.cliente_id,
      nome_oportunidade:        data.nome_oportunidade,
      empresa:                  data.empresa,
      segmento:                 data.segmento,
      produto:                  data.produto,
      ticket_estimado:          data.ticket_estimado,
      valor_potencial:          data.valor_potencial,
      stage:                    data.stage,
      probabilidade:            data.probabilidade,
      owner:                    data.owner,
      data_abertura:            data.data_abertura,
      proxima_acao:             data.proxima_acao,
      data_proxima_acao:        data.data_proxima_acao,
      risco:                    data.risco,
      motivo_perda:             data.motivo_perda,
      data_fechamento_prevista: data.data_fechamento_prevista,
      observacoes:              data.observacoes,
    })
    .select()
    .single();
  if (error) throw error;
  return coerceOpportunity(row as Record<string, unknown>);
}

// ─── CRUD — Clients ───────────────────────────────────────────────────────────

export async function listCrmClients(): Promise<CrmClient[]> {
  if (!supabase) return SEED_CLIENTS;
  const { data, error } = await supabase
    .from("jacqes_crm_clients")
    .select("id,nome,razao_social,cnpj,segmento,produto_ativo,ticket_mensal,inicio_relacao,owner,status_conta,health_score,churn_risk,potencial_expansao,observacoes")
    .order("nome");
  if (error) throw error;
  return (data ?? []).map(r => {
    const rr = r as Record<string, unknown>;
    return {
      id:                 String(rr.id ?? ""),
      nome:               String(rr.nome ?? ""),
      razao_social:       String(rr.razao_social ?? ""),
      cnpj:               String(rr.cnpj ?? ""),
      segmento:           String(rr.segmento ?? ""),
      produto_ativo:      String(rr.produto_ativo ?? ""),
      ticket_mensal:      Number(rr.ticket_mensal ?? 0),
      inicio_relacao:     rr.inicio_relacao != null ? String(rr.inicio_relacao) : null,
      owner:              String(rr.owner ?? ""),
      status_conta:       String(rr.status_conta ?? "Ativo"),
      health_score:       Number(rr.health_score ?? 80),
      churn_risk:         String(rr.churn_risk ?? "Baixo"),
      potencial_expansao: Number(rr.potencial_expansao ?? 0),
      observacoes:        String(rr.observacoes ?? ""),
    } as CrmClient;
  });
}

export async function createCrmClient(data: Omit<CrmClient, "id">): Promise<CrmClient> {
  if (!supabase) throw new Error("DB unavailable");
  const { data: row, error } = await supabase
    .from("jacqes_crm_clients")
    .insert({
      nome: data.nome, razao_social: data.razao_social, cnpj: data.cnpj,
      segmento: data.segmento, produto_ativo: data.produto_ativo,
      ticket_mensal: data.ticket_mensal, inicio_relacao: data.inicio_relacao,
      owner: data.owner, status_conta: data.status_conta,
      health_score: data.health_score, churn_risk: data.churn_risk,
      potencial_expansao: data.potencial_expansao, observacoes: data.observacoes,
    })
    .select()
    .single();
  if (error) throw error;
  const rr = row as Record<string, unknown>;
  return {
    id: String(rr.id ?? ""), nome: String(rr.nome ?? ""),
    razao_social: String(rr.razao_social ?? ""), cnpj: String(rr.cnpj ?? ""),
    segmento: String(rr.segmento ?? ""), produto_ativo: String(rr.produto_ativo ?? ""),
    ticket_mensal: Number(rr.ticket_mensal ?? 0),
    inicio_relacao: rr.inicio_relacao != null ? String(rr.inicio_relacao) : null,
    owner: String(rr.owner ?? ""), status_conta: String(rr.status_conta ?? "Ativo"),
    health_score: Number(rr.health_score ?? 80), churn_risk: String(rr.churn_risk ?? "Baixo"),
    potencial_expansao: Number(rr.potencial_expansao ?? 0), observacoes: String(rr.observacoes ?? ""),
  };
}

// ─── CRUD — Interactions ──────────────────────────────────────────────────────

export async function listInteractions(): Promise<CrmInteraction[]> {
  if (!supabase) return SEED_INTERACTIONS;
  const { data, error } = await supabase
    .from("jacqes_crm_interactions")
    .select("id,cliente_id,opportunity_id,lead_id,tipo,canal,data,resumo,proximo_passo,responsavel,satisfacao_percebida,risco_percebido")
    .order("data", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => {
    const rr = r as Record<string, unknown>;
    return {
      id: String(rr.id ?? ""),
      cliente_id:          rr.cliente_id     != null ? String(rr.cliente_id)     : null,
      opportunity_id:      rr.opportunity_id != null ? String(rr.opportunity_id) : null,
      lead_id:             rr.lead_id        != null ? String(rr.lead_id)        : null,
      tipo:                String(rr.tipo ?? ""),
      canal:               String(rr.canal ?? ""),
      data:                String(rr.data ?? ""),
      resumo:              String(rr.resumo ?? ""),
      proximo_passo:       String(rr.proximo_passo ?? ""),
      responsavel:         String(rr.responsavel ?? ""),
      satisfacao_percebida:String(rr.satisfacao_percebida ?? "Neutro"),
      risco_percebido:     String(rr.risco_percebido ?? "Baixo"),
    } as CrmInteraction;
  });
}

export async function createInteraction(data: Omit<CrmInteraction, "id">): Promise<CrmInteraction> {
  if (!supabase) throw new Error("DB unavailable");
  const { data: row, error } = await supabase
    .from("jacqes_crm_interactions")
    .insert({
      cliente_id: data.cliente_id, opportunity_id: data.opportunity_id,
      lead_id: data.lead_id, tipo: data.tipo, canal: data.canal,
      data: data.data, resumo: data.resumo, proximo_passo: data.proximo_passo,
      responsavel: data.responsavel, satisfacao_percebida: data.satisfacao_percebida,
      risco_percebido: data.risco_percebido,
    })
    .select()
    .single();
  if (error) throw error;
  const rr = row as Record<string, unknown>;
  return {
    id: String(rr.id ?? ""),
    cliente_id: rr.cliente_id != null ? String(rr.cliente_id) : null,
    opportunity_id: rr.opportunity_id != null ? String(rr.opportunity_id) : null,
    lead_id: rr.lead_id != null ? String(rr.lead_id) : null,
    tipo: String(rr.tipo ?? ""), canal: String(rr.canal ?? ""),
    data: String(rr.data ?? ""), resumo: String(rr.resumo ?? ""),
    proximo_passo: String(rr.proximo_passo ?? ""), responsavel: String(rr.responsavel ?? ""),
    satisfacao_percebida: String(rr.satisfacao_percebida ?? "Neutro"),
    risco_percebido: String(rr.risco_percebido ?? "Baixo"),
  };
}

// ─── CRUD — Tasks ─────────────────────────────────────────────────────────────

export async function listTasks(): Promise<CrmTask[]> {
  if (!supabase) return SEED_TASKS;
  const { data, error } = await supabase
    .from("jacqes_crm_tasks")
    .select("id,cliente_id,opportunity_id,lead_id,titulo,categoria,prioridade,status,responsavel,data_criacao,prazo,sla_horas,data_conclusao,bloqueio,retrabalho")
    .order("prazo", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map(r => coerceTask(r as Record<string, unknown>));
}

export async function createTask(data: Omit<CrmTask, "id">): Promise<CrmTask> {
  if (!supabase) throw new Error("DB unavailable");
  const { data: row, error } = await supabase
    .from("jacqes_crm_tasks")
    .insert({
      cliente_id: data.cliente_id, opportunity_id: data.opportunity_id,
      lead_id: data.lead_id, titulo: data.titulo, categoria: data.categoria,
      prioridade: data.prioridade, status: data.status, responsavel: data.responsavel,
      data_criacao: data.data_criacao, prazo: data.prazo, sla_horas: data.sla_horas,
      data_conclusao: data.data_conclusao, bloqueio: data.bloqueio, retrabalho: data.retrabalho,
    })
    .select()
    .single();
  if (error) throw error;
  return coerceTask(row as Record<string, unknown>);
}

export async function updateTask(id: string, patch: Partial<Omit<CrmTask, "id">>): Promise<CrmTask | null> {
  if (!supabase) throw new Error("DB unavailable");
  const update: Record<string, unknown> = {};
  const fields: (keyof Omit<CrmTask, "id">)[] = [
    "titulo","categoria","prioridade","status","responsavel","sla_horas",
    "bloqueio","retrabalho","cliente_id","opportunity_id","lead_id","prazo","data_conclusao",
  ];
  for (const f of fields) if (patch[f] != null) update[f] = patch[f];
  const { data: row, error } = await supabase
    .from("jacqes_crm_tasks").update(update).eq("id", id).select().single();
  if (error) throw error;
  return row ? coerceTask(row as Record<string, unknown>) : null;
}

export async function deleteTask(id: string): Promise<boolean> {
  if (!supabase) throw new Error("DB unavailable");
  const { error, count } = await supabase
    .from("jacqes_crm_tasks").delete().eq("id", id).select("id", { count: "exact" });
  if (error) throw error;
  return (count ?? 0) > 0;
}

// ─── CRUD — Expansion ─────────────────────────────────────────────────────────

export async function listExpansion(): Promise<CrmExpansion[]> {
  if (!supabase) return SEED_EXPANSION;
  const { data, error } = await supabase
    .from("jacqes_crm_expansion")
    .select("id,cliente_id,tipo,valor_potencial,status,owner,proxima_acao,observacoes")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => {
    const rr = r as Record<string, unknown>;
    return {
      id: String(rr.id ?? ""), cliente_id: String(rr.cliente_id ?? ""),
      tipo: String(rr.tipo ?? ""), valor_potencial: Number(rr.valor_potencial ?? 0),
      status: String(rr.status ?? ""), owner: String(rr.owner ?? ""),
      proxima_acao: String(rr.proxima_acao ?? ""), observacoes: String(rr.observacoes ?? ""),
    } as CrmExpansion;
  });
}

// ─── CRUD — Health ────────────────────────────────────────────────────────────

export async function listHealth(): Promise<CrmHealthSnapshot[]> {
  if (!supabase) return SEED_HEALTH;
  const { data, error } = await supabase
    .from("jacqes_crm_health_snapshot")
    .select("id,cliente_id,periodo,health_score,churn_risk,ultima_interacao,followups_em_dia,pendencias,expansao_aberta")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => {
    const rr = r as Record<string, unknown>;
    return {
      id: String(rr.id ?? ""), cliente_id: String(rr.cliente_id ?? ""),
      periodo: String(rr.periodo ?? ""), health_score: Number(rr.health_score ?? 80),
      churn_risk: String(rr.churn_risk ?? "Baixo"),
      ultima_interacao: rr.ultima_interacao != null ? String(rr.ultima_interacao) : null,
      followups_em_dia: Boolean(rr.followups_em_dia), pendencias: Number(rr.pendencias ?? 0),
      expansao_aberta: Boolean(rr.expansao_aberta),
    } as CrmHealthSnapshot;
  });
}

// ─── Proposals ────────────────────────────────────────────────────────────────

export async function listProposals(): Promise<CrmProposal[]> {
  if (!supabase) return SEED_PROPOSALS;
  const { data, error } = await supabase
    .from("jacqes_crm_proposals")
    .select("id,opportunity_id,versao,valor_proposto,escopo,status,data_envio,data_resposta,contraproposta,observacoes")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => {
    const rr = r as Record<string, unknown>;
    return {
      id: String(rr.id ?? ""), opportunity_id: String(rr.opportunity_id ?? ""),
      versao: Number(rr.versao ?? 1), valor_proposto: Number(rr.valor_proposto ?? 0),
      escopo: String(rr.escopo ?? ""), status: String(rr.status ?? "Rascunho"),
      data_envio:     rr.data_envio     != null ? String(rr.data_envio)     : null,
      data_resposta:  rr.data_resposta  != null ? String(rr.data_resposta)  : null,
      contraproposta: rr.contraproposta != null ? Number(rr.contraproposta) : null,
      observacoes: String(rr.observacoes ?? ""),
    } as CrmProposal;
  });
}
