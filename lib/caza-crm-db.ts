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

import { supabase } from "@/lib/supabase";
import { sql } from "@/lib/db";
import { randomUUID } from "crypto";

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

export async function initCazaCrmDB(): Promise<void> {
  if (!sql) return;
  await sql`CREATE TABLE IF NOT EXISTS caza_crm_leads (
    id TEXT PRIMARY KEY, nome TEXT NOT NULL DEFAULT '', cargo TEXT NOT NULL DEFAULT '',
    empresa TEXT NOT NULL DEFAULT '', cnpj TEXT NOT NULL DEFAULT '',
    contato_principal TEXT NOT NULL DEFAULT '', telefone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '', origem TEXT NOT NULL DEFAULT 'Indicação',
    tipo_servico TEXT NOT NULL DEFAULT '', interesse TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Novo', owner TEXT NOT NULL DEFAULT '',
    data_entrada TEXT NOT NULL DEFAULT CURRENT_DATE::text,
    observacoes TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_caza_leads_status ON caza_crm_leads(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_caza_leads_owner  ON caza_crm_leads(owner)`;

  await sql`CREATE TABLE IF NOT EXISTS caza_crm_opportunities (
    id TEXT PRIMARY KEY, lead_id TEXT REFERENCES caza_crm_leads(id) ON DELETE SET NULL,
    nome_oportunidade TEXT NOT NULL DEFAULT '', empresa TEXT NOT NULL DEFAULT '',
    tipo_servico TEXT NOT NULL DEFAULT '', valor_estimado NUMERIC NOT NULL DEFAULT 0,
    stage TEXT NOT NULL DEFAULT 'Lead Captado', probabilidade INTEGER NOT NULL DEFAULT 20,
    owner TEXT NOT NULL DEFAULT '', data_abertura TEXT NOT NULL DEFAULT CURRENT_DATE::text,
    prazo_estimado TEXT, proxima_acao TEXT NOT NULL DEFAULT '',
    data_proxima_acao TEXT, risco TEXT NOT NULL DEFAULT 'Baixo',
    motivo_perda TEXT NOT NULL DEFAULT '', observacoes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_caza_opp_stage   ON caza_crm_opportunities(stage)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_caza_opp_lead_id ON caza_crm_opportunities(lead_id)`;

  await sql`CREATE TABLE IF NOT EXISTS caza_crm_proposals (
    id TEXT PRIMARY KEY, opportunity_id TEXT NOT NULL REFERENCES caza_crm_opportunities(id) ON DELETE CASCADE,
    versao INTEGER NOT NULL DEFAULT 1, valor_proposto NUMERIC NOT NULL DEFAULT 0,
    escopo TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Em Elaboração',
    data_envio TEXT, data_resposta TEXT, observacoes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_caza_prop_opp ON caza_crm_proposals(opportunity_id)`;

  await sql`CREATE TABLE IF NOT EXISTS caza_crm_interactions (
    id TEXT PRIMARY KEY, entidade_tipo TEXT NOT NULL DEFAULT '',
    entidade_id TEXT NOT NULL DEFAULT '', tipo TEXT NOT NULL DEFAULT 'Ligação',
    descricao TEXT NOT NULL DEFAULT '', owner TEXT NOT NULL DEFAULT '',
    data TEXT NOT NULL DEFAULT CURRENT_DATE::text, observacoes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_caza_int_entidade ON caza_crm_interactions(entidade_id)`;
}

// ─── ID helpers ───────────────────────────────────────────────────────────────

export const newLeadId        = () => `CV-LEAD-${randomUUID().slice(0, 6).toUpperCase()}`;
export const newOpportunityId = () => `CV-OPP-${randomUUID().slice(0, 6).toUpperCase()}`;
export const newProposalId    = () => `CV-PROP-${randomUUID().slice(0, 6).toUpperCase()}`;
export const newInteractionId = () => `CV-INT-${randomUUID().slice(0, 6).toUpperCase()}`;

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function listLeads(): Promise<CazaCrmLead[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("caza_crm_leads")
    .select("id, nome, cargo, empresa, cnpj, contato_principal, telefone, email, origem, tipo_servico, interesse, status, owner, data_entrada, observacoes")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(coerceLead);
}

export async function createLead(l: Omit<CazaCrmLead, "id">): Promise<CazaCrmLead> {
  if (!supabase) throw new Error("DB not available");
  const id = newLeadId();
  const { data, error } = await supabase
    .from("caza_crm_leads")
    .insert({
      id,
      nome:              l.nome,
      cargo:             l.cargo,
      empresa:           l.empresa,
      cnpj:              l.cnpj,
      contato_principal: l.contato_principal,
      telefone:          l.telefone,
      email:             l.email,
      origem:            l.origem,
      tipo_servico:      l.tipo_servico,
      interesse:         l.interesse,
      status:            l.status,
      owner:             l.owner,
      data_entrada:      l.data_entrada,
      observacoes:       l.observacoes,
    })
    .select("id, nome, cargo, empresa, cnpj, contato_principal, telefone, email, origem, tipo_servico, interesse, status, owner, data_entrada, observacoes")
    .single();
  if (error) throw error;
  return coerceLead(data);
}

export async function updateLead(
  id: string,
  updates: Partial<Omit<CazaCrmLead, "id">>
): Promise<CazaCrmLead | null> {
  if (!supabase) return null;
  // Fetch current record to merge defaults
  const { data: existing, error: fetchError } = await supabase
    .from("caza_crm_leads")
    .select("id, nome, cargo, empresa, cnpj, contato_principal, telefone, email, origem, tipo_servico, interesse, status, owner, data_entrada, observacoes")
    .eq("id", id)
    .single();
  if (fetchError || !existing) return null;
  const m = { ...coerceLead(existing), ...updates };
  const { data, error } = await supabase
    .from("caza_crm_leads")
    .update({
      nome:              m.nome,
      cargo:             m.cargo,
      empresa:           m.empresa,
      cnpj:              m.cnpj,
      contato_principal: m.contato_principal,
      telefone:          m.telefone,
      email:             m.email,
      origem:            m.origem,
      tipo_servico:      m.tipo_servico,
      interesse:         m.interesse,
      status:            m.status,
      owner:             m.owner,
      observacoes:       m.observacoes,
    })
    .eq("id", id)
    .select("id, nome, cargo, empresa, cnpj, contato_principal, telefone, email, origem, tipo_servico, interesse, status, owner, data_entrada, observacoes")
    .single();
  if (error) throw error;
  return data ? coerceLead(data) : null;
}

export async function deleteLead(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("caza_crm_leads")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function listOpportunities(): Promise<CazaCrmOpportunity[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("caza_crm_opportunities")
    .select("id, lead_id, nome_oportunidade, empresa, tipo_servico, valor_estimado, stage, probabilidade, owner, data_abertura, prazo_estimado, proxima_acao, data_proxima_acao, risco, motivo_perda, observacoes")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(coerceOpportunity);
}

export async function createOpportunity(
  o: Omit<CazaCrmOpportunity, "id">
): Promise<CazaCrmOpportunity> {
  if (!supabase) throw new Error("DB not available");
  const id = newOpportunityId();
  const { data, error } = await supabase
    .from("caza_crm_opportunities")
    .insert({
      id,
      lead_id:           o.lead_id ?? null,
      nome_oportunidade: o.nome_oportunidade,
      empresa:           o.empresa,
      tipo_servico:      o.tipo_servico,
      valor_estimado:    o.valor_estimado,
      stage:             o.stage,
      probabilidade:     o.probabilidade,
      owner:             o.owner,
      data_abertura:     o.data_abertura,
      prazo_estimado:    o.prazo_estimado ?? null,
      proxima_acao:      o.proxima_acao,
      data_proxima_acao: o.data_proxima_acao ?? null,
      risco:             o.risco,
      motivo_perda:      o.motivo_perda,
      observacoes:       o.observacoes,
    })
    .select("id, lead_id, nome_oportunidade, empresa, tipo_servico, valor_estimado, stage, probabilidade, owner, data_abertura, prazo_estimado, proxima_acao, data_proxima_acao, risco, motivo_perda, observacoes")
    .single();
  if (error) throw error;
  return coerceOpportunity(data);
}

export async function updateOpportunity(
  id: string,
  updates: Partial<Omit<CazaCrmOpportunity, "id">>
): Promise<CazaCrmOpportunity | null> {
  if (!supabase) return null;
  const { data: existing, error: fetchError } = await supabase
    .from("caza_crm_opportunities")
    .select("id, lead_id, nome_oportunidade, empresa, tipo_servico, valor_estimado, stage, probabilidade, owner, data_abertura, prazo_estimado, proxima_acao, data_proxima_acao, risco, motivo_perda, observacoes")
    .eq("id", id)
    .single();
  if (fetchError || !existing) return null;
  const m = { ...coerceOpportunity(existing), ...updates };
  const { data, error } = await supabase
    .from("caza_crm_opportunities")
    .update({
      lead_id:           m.lead_id ?? null,
      nome_oportunidade: m.nome_oportunidade,
      empresa:           m.empresa,
      tipo_servico:      m.tipo_servico,
      valor_estimado:    m.valor_estimado,
      stage:             m.stage,
      probabilidade:     m.probabilidade,
      owner:             m.owner,
      prazo_estimado:    m.prazo_estimado ?? null,
      proxima_acao:      m.proxima_acao,
      data_proxima_acao: m.data_proxima_acao ?? null,
      risco:             m.risco,
      motivo_perda:      m.motivo_perda,
      observacoes:       m.observacoes,
    })
    .eq("id", id)
    .select("id, lead_id, nome_oportunidade, empresa, tipo_servico, valor_estimado, stage, probabilidade, owner, data_abertura, prazo_estimado, proxima_acao, data_proxima_acao, risco, motivo_perda, observacoes")
    .single();
  if (error) throw error;
  return data ? coerceOpportunity(data) : null;
}

export async function deleteOpportunity(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("caza_crm_opportunities")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ─── Proposals ────────────────────────────────────────────────────────────────

export async function listProposals(): Promise<CazaCrmProposal[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("caza_crm_proposals")
    .select("id, opportunity_id, versao, valor_proposto, escopo, status, data_envio, data_resposta, observacoes")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(coerceProposal);
}

export async function createProposal(
  p: Omit<CazaCrmProposal, "id">
): Promise<CazaCrmProposal> {
  if (!supabase) throw new Error("DB not available");
  const id = newProposalId();
  const { data, error } = await supabase
    .from("caza_crm_proposals")
    .insert({
      id,
      opportunity_id: p.opportunity_id,
      versao:         p.versao,
      valor_proposto: p.valor_proposto,
      escopo:         p.escopo,
      status:         p.status,
      data_envio:     p.data_envio ?? null,
      data_resposta:  p.data_resposta ?? null,
      observacoes:    p.observacoes,
    })
    .select("id, opportunity_id, versao, valor_proposto, escopo, status, data_envio, data_resposta, observacoes")
    .single();
  if (error) throw error;
  return coerceProposal(data);
}

export async function updateProposal(
  id: string,
  updates: Partial<Omit<CazaCrmProposal, "id">>
): Promise<CazaCrmProposal | null> {
  if (!supabase) return null;
  const { data: existing, error: fetchError } = await supabase
    .from("caza_crm_proposals")
    .select("id, opportunity_id, versao, valor_proposto, escopo, status, data_envio, data_resposta, observacoes")
    .eq("id", id)
    .single();
  if (fetchError || !existing) return null;
  const m = { ...coerceProposal(existing), ...updates };
  const { data, error } = await supabase
    .from("caza_crm_proposals")
    .update({
      valor_proposto: m.valor_proposto,
      escopo:         m.escopo,
      status:         m.status,
      data_envio:     m.data_envio ?? null,
      data_resposta:  m.data_resposta ?? null,
      observacoes:    m.observacoes,
    })
    .eq("id", id)
    .select("id, opportunity_id, versao, valor_proposto, escopo, status, data_envio, data_resposta, observacoes")
    .single();
  if (error) throw error;
  return data ? coerceProposal(data) : null;
}

export async function deleteProposal(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("caza_crm_proposals")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export async function listInteractions(entidade_id?: string): Promise<CazaCrmInteraction[]> {
  if (!supabase) return [];
  let query = supabase
    .from("caza_crm_interactions")
    .select("id, entidade_tipo, entidade_id, tipo, descricao, owner, data, observacoes")
    .order("created_at", { ascending: false });
  if (entidade_id) {
    query = query.eq("entidade_id", entidade_id);
  } else {
    query = query.limit(100);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(coerceInteraction);
}

export async function createInteraction(
  i: Omit<CazaCrmInteraction, "id">
): Promise<CazaCrmInteraction> {
  if (!supabase) throw new Error("DB not available");
  const id = newInteractionId();
  const { data, error } = await supabase
    .from("caza_crm_interactions")
    .insert({
      id,
      entidade_tipo: i.entidade_tipo,
      entidade_id:   i.entidade_id,
      tipo:          i.tipo,
      descricao:     i.descricao,
      owner:         i.owner,
      data:          i.data,
      observacoes:   i.observacoes,
    })
    .select("id, entidade_tipo, entidade_id, tipo, descricao, owner, data, observacoes")
    .single();
  if (error) throw error;
  return coerceInteraction(data);
}

export async function updateInteraction(
  id: string,
  updates: Partial<Omit<CazaCrmInteraction, "id">>
): Promise<CazaCrmInteraction | null> {
  if (!supabase) return null;
  const { data: existing, error: fetchError } = await supabase
    .from("caza_crm_interactions")
    .select("id, entidade_tipo, entidade_id, tipo, descricao, owner, data, observacoes")
    .eq("id", id)
    .single();
  if (fetchError || !existing) return null;
  const m = { ...coerceInteraction(existing), ...updates };
  const { data, error } = await supabase
    .from("caza_crm_interactions")
    .update({
      entidade_tipo: m.entidade_tipo,
      entidade_id:   m.entidade_id,
      tipo:          m.tipo,
      descricao:     m.descricao,
      owner:         m.owner,
      data:          m.data,
      observacoes:   m.observacoes,
    })
    .eq("id", id)
    .select("id, entidade_tipo, entidade_id, tipo, descricao, owner, data, observacoes")
    .single();
  if (error) throw error;
  return data ? coerceInteraction(data) : null;
}

export async function deleteInteraction(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("caza_crm_interactions")
    .delete()
    .eq("id", id);
  if (error) throw error;
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
