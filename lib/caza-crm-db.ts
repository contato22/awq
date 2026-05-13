// ─── Caza Vision — CRM Database Layer ─────────────────────────────────────────
//
// SOURCE OF TRUTH: Supabase Postgres.
// GitHub Pages: static JSON snapshots (read-only).
//
// Tables — ISOLATED from JACQES CRM (jacqes_crm_*):
//   caza_crm_leads         — prospecção e qualificação
//   caza_crm_opportunities — oportunidades comerciais
//   caza_crm_proposals     — propostas vinculadas a oportunidades
//   caza_crm_interactions  — histórico de interações
//
// Zero imports from jacqes-crm-db — separação total de BU.

import { getSupabaseAdmin } from "@/lib/supabase";

// ─── Enumerações ──────────────────────────────────────────────────────────────

export const CAZA_PIPELINE_STAGES = [
  "Lead Captado",
  "Qualificação",
  "Briefing Inicial",
  "Proposta Enviada",
  "Negociação",
  "Fechado Ganho",
  "Fechado Perdido",
] as const;

export const CAZA_SERVICE_TYPES = [
  "Vídeo Publicitário",
  "Filme Institucional",
  "Evento / Live",
  "Conteúdo Digital",
  "Fotografia",
  "Motion / Animação",
  "Outro",
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

// ─── Schema bootstrap ─────────────────────────────────────────────────────────

export async function initCazaCrmDB(): Promise<void> {}

// ─── ID helpers ───────────────────────────────────────────────────────────────

export const newLeadId        = () => `CV-LEAD-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
export const newOpportunityId = () => `CV-OPP-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
export const newProposalId    = () => `CV-PROP-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
export const newInteractionId = () => `CV-INT-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function listLeads(): Promise<CazaCrmLead[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data } = await sb.from("caza_crm_leads").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(coerceLead);
}

export async function createLead(l: Omit<CazaCrmLead, "id">): Promise<CazaCrmLead> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const id = newLeadId();
  const { data: row, error } = await sb
    .from("caza_crm_leads")
    .insert({ id, ...l })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return coerceLead(row);
}

export async function updateLead(
  id: string,
  updates: Partial<Omit<CazaCrmLead, "id">>
): Promise<CazaCrmLead | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data: row, error } = await sb
    .from("caza_crm_leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return null;
  return coerceLead(row);
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function listOpportunities(): Promise<CazaCrmOpportunity[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data } = await sb.from("caza_crm_opportunities").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(coerceOpportunity);
}

export async function createOpportunity(
  o: Omit<CazaCrmOpportunity, "id">
): Promise<CazaCrmOpportunity> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const id = newOpportunityId();
  const { data: row, error } = await sb
    .from("caza_crm_opportunities")
    .insert({ id, ...o })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return coerceOpportunity(row);
}

export async function updateOpportunity(
  id: string,
  updates: Partial<Omit<CazaCrmOpportunity, "id">>
): Promise<CazaCrmOpportunity | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data: row, error } = await sb
    .from("caza_crm_opportunities")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return null;
  return coerceOpportunity(row);
}

// ─── Proposals ────────────────────────────────────────────────────────────────

export async function listProposals(): Promise<CazaCrmProposal[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data } = await sb.from("caza_crm_proposals").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(coerceProposal);
}

export async function createProposal(
  p: Omit<CazaCrmProposal, "id">
): Promise<CazaCrmProposal> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const id = newProposalId();
  const { data: row, error } = await sb
    .from("caza_crm_proposals")
    .insert({ id, ...p })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return coerceProposal(row);
}

export async function updateProposal(
  id: string,
  updates: Partial<Omit<CazaCrmProposal, "id">>
): Promise<CazaCrmProposal | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data: row, error } = await sb
    .from("caza_crm_proposals")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return null;
  return coerceProposal(row);
}

export async function deleteLead(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  await sb.from("caza_crm_leads").delete().eq("id", id);
}

export async function deleteOpportunity(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  await sb.from("caza_crm_opportunities").delete().eq("id", id);
}

export async function deleteProposal(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  await sb.from("caza_crm_proposals").delete().eq("id", id);
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export async function listInteractions(entidade_id?: string): Promise<CazaCrmInteraction[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  let query = sb.from("caza_crm_interactions").select("*").order("created_at", { ascending: false });
  if (entidade_id) {
    query = query.eq("entidade_id", entidade_id);
  } else {
    query = query.limit(100);
  }
  const { data } = await query;
  return (data ?? []).map(coerceInteraction);
}

export async function createInteraction(
  i: Omit<CazaCrmInteraction, "id">
): Promise<CazaCrmInteraction> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const id = newInteractionId();
  const { data: row, error } = await sb
    .from("caza_crm_interactions")
    .insert({ id, ...i })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return coerceInteraction(row);
}

// ─── Coercions (DB rows → typed objects) ──────────────────────────────────────

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
    prazo_estimado:    r.prazo_estimado != null ? String(r.prazo_estimado) : null,
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
    data_envio:     r.data_envio != null ? String(r.data_envio) : null,
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
