// ─── Caza Vision — CRM Database Layer (Supabase) ──────────────────────────────
// Funciona em servidor (Vercel) e no browser (GitHub Pages estático).
// supabase é null quando as vars de ambiente não estão presentes.
// ISOLADO de jacqes-crm-db — zero compartilhamento de tabelas.

import { supabase } from "@/lib/supabase";

// ─── Enumerações ──────────────────────────────────────────────────────────────

export const CAZA_PIPELINE_STAGES = [
  "Lead Captado", "Qualificação", "Briefing Inicial",
  "Proposta Enviada", "Negociação", "Fechado Ganho", "Fechado Perdido",
] as const;

export const CAZA_SERVICE_TYPES = [
  "Vídeo Publicitário", "Filme Institucional", "Evento / Live",
  "Conteúdo Digital", "Fotografia", "Motion / Animação", "Outro",
] as const;

export const CAZA_LEAD_ORIGENS = [
  "Indicação", "Instagram", "LinkedIn", "WhatsApp", "Site", "Evento", "Outro",
] as const;

export const CAZA_LEAD_STATUSES = [
  "Novo", "Qualificando", "Convertido", "Perdido", "Nurturing",
] as const;

export const CAZA_PROPOSAL_STATUSES = [
  "Em Elaboração", "Enviada", "Aprovada", "Rejeitada", "Em Revisão",
] as const;

export const CAZA_INTERACTION_TYPES = [
  "Ligação", "Reunião", "WhatsApp", "E-mail",
  "Follow-up", "Proposta Enviada", "Alinhamento", "Observação",
] as const;

export const CAZA_RISK_LEVELS = ["Baixo", "Médio", "Alto"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type CazaCrmLead = {
  id: string;
  nome: string;
  cargo: string;
  empresa: string;
  cnpj: string;
  contato_principal: string;
  telefone: string;
  email: string;
  origem: string;
  tipo_servico: string;
  interesse: string;
  status: string;
  owner: string;
  data_entrada: string;
  observacoes: string;
};

export type CazaCrmOpportunity = {
  id: string;
  lead_id: string | null;
  nome_oportunidade: string;
  empresa: string;
  tipo_servico: string;
  valor_estimado: number;
  stage: string;
  probabilidade: number;
  owner: string;
  data_abertura: string;
  prazo_estimado: string | null;
  proxima_acao: string;
  data_proxima_acao: string | null;
  risco: string;
  motivo_perda: string;
  observacoes: string;
};

export type CazaCrmProposal = {
  id: string;
  opportunity_id: string;
  versao: number;
  valor_proposto: number;
  escopo: string;
  status: string;
  data_envio: string | null;
  data_resposta: string | null;
  observacoes: string;
};

export type CazaCrmInteraction = {
  id: string;
  entidade_tipo: string;
  entidade_id: string;
  tipo: string;
  descricao: string;
  owner: string;
  data: string;
  observacoes: string;
};

// ─── Schema Bootstrap (no-op — schema gerenciado no Supabase Console) ─────────
export async function initCazaCrmDB(): Promise<void> { /* no-op */ }

// ─── ID helpers ───────────────────────────────────────────────────────────────

function shortId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
export const newLeadId        = () => `CV-LEAD-${shortId()}`;
export const newOpportunityId = () => `CV-OPP-${shortId()}`;
export const newProposalId    = () => `CV-PROP-${shortId()}`;
export const newInteractionId = () => `CV-INT-${shortId()}`;

// ─── Coercions ────────────────────────────────────────────────────────────────

function coerceLead(r: Record<string, unknown>): CazaCrmLead {
  return {
    id:                String(r.id ?? ""),
    nome:              String(r.nome ?? ""),
    cargo:             String(r.cargo ?? ""),
    empresa:           String(r.empresa ?? ""),
    cnpj:              String(r.cnpj ?? ""),
    contato_principal: String(r.contato_principal ?? ""),
    telefone:          String(r.telefone ?? ""),
    email:             String(r.email ?? ""),
    origem:            String(r.origem ?? ""),
    tipo_servico:      String(r.tipo_servico ?? ""),
    interesse:         String(r.interesse ?? ""),
    status:            String(r.status ?? "Novo"),
    owner:             String(r.owner ?? ""),
    data_entrada:      String(r.data_entrada ?? ""),
    observacoes:       String(r.observacoes ?? ""),
  };
}

function coerceOpportunity(r: Record<string, unknown>): CazaCrmOpportunity {
  return {
    id:                String(r.id ?? ""),
    lead_id:           r.lead_id != null ? String(r.lead_id) : null,
    nome_oportunidade: String(r.nome_oportunidade ?? ""),
    empresa:           String(r.empresa ?? ""),
    tipo_servico:      String(r.tipo_servico ?? ""),
    valor_estimado:    Number(r.valor_estimado ?? 0),
    stage:             String(r.stage ?? "Lead Captado"),
    probabilidade:     Number(r.probabilidade ?? 0),
    owner:             String(r.owner ?? ""),
    data_abertura:     String(r.data_abertura ?? ""),
    prazo_estimado:    r.prazo_estimado    != null ? String(r.prazo_estimado)    : null,
    proxima_acao:      String(r.proxima_acao ?? ""),
    data_proxima_acao: r.data_proxima_acao != null ? String(r.data_proxima_acao) : null,
    risco:             String(r.risco ?? "Baixo"),
    motivo_perda:      String(r.motivo_perda ?? ""),
    observacoes:       String(r.observacoes ?? ""),
  };
}

function coerceProposal(r: Record<string, unknown>): CazaCrmProposal {
  return {
    id:             String(r.id ?? ""),
    opportunity_id: String(r.opportunity_id ?? ""),
    versao:         Number(r.versao ?? 1),
    valor_proposto: Number(r.valor_proposto ?? 0),
    escopo:         String(r.escopo ?? ""),
    status:         String(r.status ?? "Em Elaboração"),
    data_envio:     r.data_envio    != null ? String(r.data_envio)    : null,
    data_resposta:  r.data_resposta != null ? String(r.data_resposta) : null,
    observacoes:    String(r.observacoes ?? ""),
  };
}

function coerceInteraction(r: Record<string, unknown>): CazaCrmInteraction {
  return {
    id:            String(r.id ?? ""),
    entidade_tipo: String(r.entidade_tipo ?? ""),
    entidade_id:   String(r.entidade_id ?? ""),
    tipo:          String(r.tipo ?? ""),
    descricao:     String(r.descricao ?? ""),
    owner:         String(r.owner ?? ""),
    data:          String(r.data ?? ""),
    observacoes:   String(r.observacoes ?? ""),
  };
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function listLeads(): Promise<CazaCrmLead[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("caza_crm_leads")
    .select("id,nome,cargo,empresa,cnpj,contato_principal,telefone,email,origem,tipo_servico,interesse,status,owner,data_entrada,observacoes")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => coerceLead(r as Record<string, unknown>));
}

export async function createLead(l: Omit<CazaCrmLead, "id">): Promise<CazaCrmLead> {
  if (!supabase) throw new Error("DB not available");
  const id = newLeadId();
  const { data: row, error } = await supabase
    .from("caza_crm_leads")
    .insert({ id, ...l })
    .select("id,nome,cargo,empresa,cnpj,contato_principal,telefone,email,origem,tipo_servico,interesse,status,owner,data_entrada,observacoes")
    .single();
  if (error) throw error;
  return coerceLead(row as Record<string, unknown>);
}

export async function updateLead(
  id: string,
  updates: Partial<Omit<CazaCrmLead, "id">>
): Promise<CazaCrmLead | null> {
  if (!supabase) return null;
  const { data: existing } = await supabase.from("caza_crm_leads").select("*").eq("id", id).single();
  if (!existing) return null;
  const merged = { ...coerceLead(existing as Record<string, unknown>), ...updates };
  const { data: row, error } = await supabase
    .from("caza_crm_leads")
    .update(merged)
    .eq("id", id)
    .select("id,nome,cargo,empresa,cnpj,contato_principal,telefone,email,origem,tipo_servico,interesse,status,owner,data_entrada,observacoes")
    .single();
  if (error) throw error;
  return row ? coerceLead(row as Record<string, unknown>) : null;
}

export async function deleteLead(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("caza_crm_leads").delete().eq("id", id);
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function listOpportunities(): Promise<CazaCrmOpportunity[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("caza_crm_opportunities")
    .select("id,lead_id,nome_oportunidade,empresa,tipo_servico,valor_estimado,stage,probabilidade,owner,data_abertura,prazo_estimado,proxima_acao,data_proxima_acao,risco,motivo_perda,observacoes")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => coerceOpportunity(r as Record<string, unknown>));
}

export async function createOpportunity(o: Omit<CazaCrmOpportunity, "id">): Promise<CazaCrmOpportunity> {
  if (!supabase) throw new Error("DB not available");
  const id = newOpportunityId();
  const { data: row, error } = await supabase
    .from("caza_crm_opportunities")
    .insert({ id, lead_id: o.lead_id ?? null, nome_oportunidade: o.nome_oportunidade,
      empresa: o.empresa, tipo_servico: o.tipo_servico, valor_estimado: o.valor_estimado,
      stage: o.stage, probabilidade: o.probabilidade, owner: o.owner,
      data_abertura: o.data_abertura, prazo_estimado: o.prazo_estimado ?? null,
      proxima_acao: o.proxima_acao, data_proxima_acao: o.data_proxima_acao ?? null,
      risco: o.risco, motivo_perda: o.motivo_perda, observacoes: o.observacoes,
    })
    .select("id,lead_id,nome_oportunidade,empresa,tipo_servico,valor_estimado,stage,probabilidade,owner,data_abertura,prazo_estimado,proxima_acao,data_proxima_acao,risco,motivo_perda,observacoes")
    .single();
  if (error) throw error;
  return coerceOpportunity(row as Record<string, unknown>);
}

export async function updateOpportunity(
  id: string,
  updates: Partial<Omit<CazaCrmOpportunity, "id">>
): Promise<CazaCrmOpportunity | null> {
  if (!supabase) return null;
  const { data: existing } = await supabase.from("caza_crm_opportunities").select("*").eq("id", id).single();
  if (!existing) return null;
  const merged = { ...coerceOpportunity(existing as Record<string, unknown>), ...updates };
  const { data: row, error } = await supabase
    .from("caza_crm_opportunities").update(merged).eq("id", id)
    .select("id,lead_id,nome_oportunidade,empresa,tipo_servico,valor_estimado,stage,probabilidade,owner,data_abertura,prazo_estimado,proxima_acao,data_proxima_acao,risco,motivo_perda,observacoes")
    .single();
  if (error) throw error;
  return row ? coerceOpportunity(row as Record<string, unknown>) : null;
}

export async function deleteOpportunity(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("caza_crm_opportunities").delete().eq("id", id);
}

// ─── Proposals ────────────────────────────────────────────────────────────────

export async function listProposals(): Promise<CazaCrmProposal[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("caza_crm_proposals")
    .select("id,opportunity_id,versao,valor_proposto,escopo,status,data_envio,data_resposta,observacoes")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => coerceProposal(r as Record<string, unknown>));
}

export async function createProposal(p: Omit<CazaCrmProposal, "id">): Promise<CazaCrmProposal> {
  if (!supabase) throw new Error("DB not available");
  const id = newProposalId();
  const { data: row, error } = await supabase
    .from("caza_crm_proposals")
    .insert({ id, opportunity_id: p.opportunity_id, versao: p.versao,
      valor_proposto: p.valor_proposto, escopo: p.escopo, status: p.status,
      data_envio: p.data_envio ?? null, data_resposta: p.data_resposta ?? null,
      observacoes: p.observacoes,
    })
    .select("id,opportunity_id,versao,valor_proposto,escopo,status,data_envio,data_resposta,observacoes")
    .single();
  if (error) throw error;
  return coerceProposal(row as Record<string, unknown>);
}

export async function updateProposal(
  id: string,
  updates: Partial<Omit<CazaCrmProposal, "id">>
): Promise<CazaCrmProposal | null> {
  if (!supabase) return null;
  const { data: existing } = await supabase.from("caza_crm_proposals").select("*").eq("id", id).single();
  if (!existing) return null;
  const merged = { ...coerceProposal(existing as Record<string, unknown>), ...updates };
  const { data: row, error } = await supabase
    .from("caza_crm_proposals").update(merged).eq("id", id)
    .select("id,opportunity_id,versao,valor_proposto,escopo,status,data_envio,data_resposta,observacoes")
    .single();
  if (error) throw error;
  return row ? coerceProposal(row as Record<string, unknown>) : null;
}

export async function deleteProposal(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("caza_crm_proposals").delete().eq("id", id);
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export async function listInteractions(entidade_id?: string): Promise<CazaCrmInteraction[]> {
  if (!supabase) return [];
  let q = supabase
    .from("caza_crm_interactions")
    .select("id,entidade_tipo,entidade_id,tipo,descricao,owner,data,observacoes")
    .order("created_at", { ascending: false });
  if (entidade_id) q = q.eq("entidade_id", entidade_id);
  else q = q.limit(100);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(r => coerceInteraction(r as Record<string, unknown>));
}

export async function createInteraction(i: Omit<CazaCrmInteraction, "id">): Promise<CazaCrmInteraction> {
  if (!supabase) throw new Error("DB not available");
  const id = newInteractionId();
  const { data: row, error } = await supabase
    .from("caza_crm_interactions")
    .insert({ id, entidade_tipo: i.entidade_tipo, entidade_id: i.entidade_id,
      tipo: i.tipo, descricao: i.descricao, owner: i.owner, data: i.data,
      observacoes: i.observacoes,
    })
    .select("id,entidade_tipo,entidade_id,tipo,descricao,owner,data,observacoes")
    .single();
  if (error) throw error;
  return coerceInteraction(row as Record<string, unknown>);
}
