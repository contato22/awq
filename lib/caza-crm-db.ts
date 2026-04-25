// ─── Caza Vision — CRM Database Layer ─────────────────────────────────────────
//
// SOURCE OF TRUTH: Neon Postgres (Vercel).
// GitHub Pages: static JSON snapshots (read-only).
//
// Tables — ISOLATED from JACQES CRM (jacqes_crm_*):
//   caza_crm_leads         — prospecção e qualificação
//   caza_crm_opportunities — oportunidades comerciais
//   caza_crm_proposals     — propostas vinculadas a oportunidades
//   caza_crm_interactions  — histórico de interações
//
// Zero imports from jacqes-crm-db — separação total de BU.

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

export const CAZA_RISK_LEVELS        = ["Baixo", "Médio", "Alto"] as const;
export const CAZA_ICP_LEVELS         = ["Alto", "Médio", "Baixo"] as const;
export const CAZA_URGENCIA_LEVELS    = ["Alta", "Média", "Baixa"] as const;
export const CAZA_CONSCIENCIA_LEVELS = [
  "Sem Problema", "Com Problema", "Buscando Solução", "Comparando", "Pronto para Comprar",
] as const;
export const CAZA_TIPO_NEGOCIO = ["Recorrente", "Projeto", "Avulso"] as const;
export const CAZA_SAUDE_CONTA  = ["Saudável", "Atenção", "Risco"] as const;

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
  // Qualificação SQL
  fit_icp: string;
  decisor: string;
  urgencia: string;
  dor_principal: string;
  cidade: string;
  estagio_consciencia: string;
  data_ultima_interacao: string | null;
  data_proxima_acao_crm: string | null;
  tipo_negocio: string;
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
  data_ultima_interacao: string | null;
  tipo_negocio: string;
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
  validade: string | null;
  objecoes: string;
  observacoes: string;
};

// ─── SQL Score ─────────────────────────────────────────────────────────────────

export type SqlScoreLabel = "Frio" | "Aquecendo" | "MQL" | "SQL";

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export function calcSqlScore(l: Pick<CazaCrmLead,
  "fit_icp" | "decisor" | "urgencia" | "dor_principal" | "tipo_servico" |
  "data_ultima_interacao" | "estagio_consciencia">
): { score: number; label: SqlScoreLabel } {
  let pts = 0;
  // Fit ICP (25)
  if      (l.fit_icp === "Alto")  pts += 25;
  else if (l.fit_icp === "Médio") pts += 12;
  else if (l.fit_icp === "Baixo") pts += 4;
  // Decisor identificado (15)
  if (l.decisor?.trim()) pts += 15;
  // Urgência (20)
  if      (l.urgencia === "Alta")  pts += 20;
  else if (l.urgencia === "Média") pts += 10;
  else if (l.urgencia === "Baixa") pts += 3;
  // Dor principal definida (10)
  if (l.dor_principal?.trim()) pts += 10;
  // Serviço de interesse (10)
  if (l.tipo_servico?.trim()) pts += 10;
  // Engajamento recente (15)
  const ds = daysSince(l.data_ultima_interacao);
  if      (ds !== null && ds <= 7)  pts += 15;
  else if (ds !== null && ds <= 30) pts += 8;
  else if (ds !== null && ds <= 60) pts += 3;
  // Estágio de consciência (15)
  const cm: Record<string, number> = {
    "Pronto para Comprar": 15, "Comparando": 12, "Buscando Solução": 8,
    "Com Problema": 4, "Sem Problema": 0,
  };
  pts += cm[l.estagio_consciencia] ?? 0;
  // Max teórico: 110 → normaliza p/ 100
  const score = Math.min(100, Math.round((pts / 110) * 100));
  let label: SqlScoreLabel;
  if      (score >= 70) label = "SQL";
  else if (score >= 45) label = "MQL";
  else if (score >= 20) label = "Aquecendo";
  else                  label = "Frio";
  return { score, label };
}

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

  await sql`
    CREATE TABLE IF NOT EXISTS caza_crm_leads (
      id                    TEXT PRIMARY KEY,
      nome                  TEXT NOT NULL DEFAULT '',
      cargo                 TEXT NOT NULL DEFAULT '',
      empresa               TEXT NOT NULL DEFAULT '',
      cnpj                  TEXT NOT NULL DEFAULT '',
      contato_principal     TEXT NOT NULL DEFAULT '',
      telefone              TEXT NOT NULL DEFAULT '',
      email                 TEXT NOT NULL DEFAULT '',
      origem                TEXT NOT NULL DEFAULT '',
      tipo_servico          TEXT NOT NULL DEFAULT '',
      interesse             TEXT NOT NULL DEFAULT '',
      status                TEXT NOT NULL DEFAULT 'Novo',
      owner                 TEXT NOT NULL DEFAULT '',
      data_entrada          TEXT NOT NULL DEFAULT '',
      observacoes           TEXT NOT NULL DEFAULT '',
      fit_icp               TEXT NOT NULL DEFAULT '',
      decisor               TEXT NOT NULL DEFAULT '',
      urgencia              TEXT NOT NULL DEFAULT '',
      dor_principal         TEXT NOT NULL DEFAULT '',
      cidade                TEXT NOT NULL DEFAULT '',
      estagio_consciencia   TEXT NOT NULL DEFAULT '',
      data_ultima_interacao TEXT,
      data_proxima_acao_crm TEXT,
      tipo_negocio          TEXT NOT NULL DEFAULT '',
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE caza_crm_leads ADD COLUMN IF NOT EXISTS cargo                 TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE caza_crm_leads ADD COLUMN IF NOT EXISTS cnpj                  TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE caza_crm_leads ADD COLUMN IF NOT EXISTS fit_icp               TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE caza_crm_leads ADD COLUMN IF NOT EXISTS decisor               TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE caza_crm_leads ADD COLUMN IF NOT EXISTS urgencia              TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE caza_crm_leads ADD COLUMN IF NOT EXISTS dor_principal         TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE caza_crm_leads ADD COLUMN IF NOT EXISTS cidade                TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE caza_crm_leads ADD COLUMN IF NOT EXISTS estagio_consciencia   TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE caza_crm_leads ADD COLUMN IF NOT EXISTS data_ultima_interacao TEXT`;
  await sql`ALTER TABLE caza_crm_leads ADD COLUMN IF NOT EXISTS data_proxima_acao_crm TEXT`;
  await sql`ALTER TABLE caza_crm_leads ADD COLUMN IF NOT EXISTS tipo_negocio          TEXT NOT NULL DEFAULT ''`;

  await sql`
    CREATE TABLE IF NOT EXISTS caza_crm_opportunities (
      id                    TEXT PRIMARY KEY,
      lead_id               TEXT,
      nome_oportunidade     TEXT NOT NULL DEFAULT '',
      empresa               TEXT NOT NULL DEFAULT '',
      tipo_servico          TEXT NOT NULL DEFAULT '',
      valor_estimado        NUMERIC NOT NULL DEFAULT 0,
      stage                 TEXT NOT NULL DEFAULT 'Lead Captado',
      probabilidade         NUMERIC NOT NULL DEFAULT 0,
      owner                 TEXT NOT NULL DEFAULT '',
      data_abertura         TEXT NOT NULL DEFAULT '',
      prazo_estimado        TEXT,
      proxima_acao          TEXT NOT NULL DEFAULT '',
      data_proxima_acao     TEXT,
      risco                 TEXT NOT NULL DEFAULT 'Baixo',
      motivo_perda          TEXT NOT NULL DEFAULT '',
      observacoes           TEXT NOT NULL DEFAULT '',
      data_ultima_interacao TEXT,
      tipo_negocio          TEXT NOT NULL DEFAULT '',
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS caza_crm_proposals (
      id              TEXT PRIMARY KEY,
      opportunity_id  TEXT NOT NULL DEFAULT '',
      versao          INTEGER NOT NULL DEFAULT 1,
      valor_proposto  NUMERIC NOT NULL DEFAULT 0,
      escopo          TEXT NOT NULL DEFAULT '',
      status          TEXT NOT NULL DEFAULT 'Em Elaboração',
      data_envio      TEXT,
      data_resposta   TEXT,
      validade        TEXT,
      objecoes        TEXT NOT NULL DEFAULT '',
      observacoes     TEXT NOT NULL DEFAULT '',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS caza_crm_interactions (
      id            TEXT PRIMARY KEY,
      entidade_tipo TEXT NOT NULL DEFAULT '',
      entidade_id   TEXT NOT NULL DEFAULT '',
      tipo          TEXT NOT NULL DEFAULT '',
      descricao     TEXT NOT NULL DEFAULT '',
      owner         TEXT NOT NULL DEFAULT '',
      data          TEXT NOT NULL DEFAULT '',
      observacoes   TEXT NOT NULL DEFAULT '',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE caza_crm_opportunities ADD COLUMN IF NOT EXISTS data_ultima_interacao TEXT`;
  await sql`ALTER TABLE caza_crm_opportunities ADD COLUMN IF NOT EXISTS tipo_negocio TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE caza_crm_proposals ADD COLUMN IF NOT EXISTS validade  TEXT`;
  await sql`ALTER TABLE caza_crm_proposals ADD COLUMN IF NOT EXISTS objecoes  TEXT NOT NULL DEFAULT ''`;

  await sql`CREATE INDEX IF NOT EXISTS idx_caza_crm_leads_status ON caza_crm_leads(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_caza_crm_leads_created ON caza_crm_leads(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_caza_crm_opps_stage ON caza_crm_opportunities(stage)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_caza_crm_opps_created ON caza_crm_opportunities(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_caza_crm_props_opp ON caza_crm_proposals(opportunity_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_caza_crm_int_entidade ON caza_crm_interactions(entidade_id)`;
}

// ─── ID helpers ───────────────────────────────────────────────────────────────

export const newLeadId        = () => `CV-LEAD-${randomUUID().slice(0, 6).toUpperCase()}`;
export const newOpportunityId = () => `CV-OPP-${randomUUID().slice(0, 6).toUpperCase()}`;
export const newProposalId    = () => `CV-PROP-${randomUUID().slice(0, 6).toUpperCase()}`;
export const newInteractionId = () => `CV-INT-${randomUUID().slice(0, 6).toUpperCase()}`;

// ─── Leads ────────────────────────────────────────────────────────────────────

const LEAD_COLS = `id, nome, cargo, empresa, cnpj, contato_principal, telefone, email,
  origem, tipo_servico, interesse, status, owner, data_entrada, observacoes,
  fit_icp, decisor, urgencia, dor_principal, cidade, estagio_consciencia,
  data_ultima_interacao, data_proxima_acao_crm, tipo_negocio`;

export async function listLeads(): Promise<CazaCrmLead[]> {
  if (!sql) return [];
  const rows = await sql`SELECT ${sql.unsafe(LEAD_COLS)} FROM caza_crm_leads ORDER BY created_at DESC`;
  return rows.map(coerceLead);
}

export async function createLead(l: Omit<CazaCrmLead, "id">): Promise<CazaCrmLead> {
  if (!sql) throw new Error("DB not available");
  const id = newLeadId();
  const rows = await sql`
    INSERT INTO caza_crm_leads (
      id, nome, cargo, empresa, cnpj, contato_principal, telefone, email,
      origem, tipo_servico, interesse, status, owner, data_entrada, observacoes,
      fit_icp, decisor, urgencia, dor_principal, cidade, estagio_consciencia,
      data_ultima_interacao, data_proxima_acao_crm, tipo_negocio
    ) VALUES (
      ${id}, ${l.nome}, ${l.cargo}, ${l.empresa}, ${l.cnpj}, ${l.contato_principal},
      ${l.telefone}, ${l.email}, ${l.origem}, ${l.tipo_servico}, ${l.interesse},
      ${l.status}, ${l.owner}, ${l.data_entrada}, ${l.observacoes},
      ${l.fit_icp}, ${l.decisor}, ${l.urgencia}, ${l.dor_principal}, ${l.cidade},
      ${l.estagio_consciencia}, ${l.data_ultima_interacao ?? null},
      ${l.data_proxima_acao_crm ?? null}, ${l.tipo_negocio}
    ) RETURNING ${sql.unsafe(LEAD_COLS)}
  `;
  return coerceLead(rows[0]);
}

export async function updateLead(
  id: string,
  updates: Partial<Omit<CazaCrmLead, "id">>
): Promise<CazaCrmLead | null> {
  if (!sql) return null;
  const rows = await sql`SELECT ${sql.unsafe(LEAD_COLS)} FROM caza_crm_leads WHERE id = ${id}`;
  if (!rows[0]) return null;
  const m = { ...coerceLead(rows[0]), ...updates };
  const updated = await sql`
    UPDATE caza_crm_leads SET
      nome = ${m.nome}, cargo = ${m.cargo}, empresa = ${m.empresa}, cnpj = ${m.cnpj},
      contato_principal = ${m.contato_principal}, telefone = ${m.telefone},
      email = ${m.email}, origem = ${m.origem}, tipo_servico = ${m.tipo_servico},
      interesse = ${m.interesse}, status = ${m.status}, owner = ${m.owner},
      observacoes = ${m.observacoes}, fit_icp = ${m.fit_icp}, decisor = ${m.decisor},
      urgencia = ${m.urgencia}, dor_principal = ${m.dor_principal}, cidade = ${m.cidade},
      estagio_consciencia = ${m.estagio_consciencia},
      data_ultima_interacao = ${m.data_ultima_interacao ?? null},
      data_proxima_acao_crm = ${m.data_proxima_acao_crm ?? null},
      tipo_negocio = ${m.tipo_negocio}
    WHERE id = ${id}
    RETURNING ${sql.unsafe(LEAD_COLS)}
  `;
  return updated[0] ? coerceLead(updated[0]) : null;
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function listOpportunities(): Promise<CazaCrmOpportunity[]> {
  if (!sql) return [];
  const rows = await sql`
    SELECT id, lead_id, nome_oportunidade, empresa, tipo_servico, valor_estimado,
           stage, probabilidade, owner, data_abertura, prazo_estimado,
           proxima_acao, data_proxima_acao, risco, motivo_perda, observacoes,
           data_ultima_interacao, tipo_negocio
    FROM caza_crm_opportunities ORDER BY created_at DESC
  `;
  return rows.map(coerceOpportunity);
}

export async function createOpportunity(
  o: Omit<CazaCrmOpportunity, "id">
): Promise<CazaCrmOpportunity> {
  if (!sql) throw new Error("DB not available");
  const id = newOpportunityId();
  const rows = await sql`
    INSERT INTO caza_crm_opportunities (
      id, lead_id, nome_oportunidade, empresa, tipo_servico, valor_estimado,
      stage, probabilidade, owner, data_abertura, prazo_estimado,
      proxima_acao, data_proxima_acao, risco, motivo_perda, observacoes,
      data_ultima_interacao, tipo_negocio
    ) VALUES (
      ${id}, ${o.lead_id ?? null}, ${o.nome_oportunidade}, ${o.empresa},
      ${o.tipo_servico}, ${o.valor_estimado}, ${o.stage}, ${o.probabilidade},
      ${o.owner}, ${o.data_abertura}, ${o.prazo_estimado ?? null},
      ${o.proxima_acao}, ${o.data_proxima_acao ?? null}, ${o.risco},
      ${o.motivo_perda}, ${o.observacoes},
      ${o.data_ultima_interacao ?? null}, ${o.tipo_negocio}
    ) RETURNING id, lead_id, nome_oportunidade, empresa, tipo_servico, valor_estimado,
                stage, probabilidade, owner, data_abertura, prazo_estimado,
                proxima_acao, data_proxima_acao, risco, motivo_perda, observacoes,
                data_ultima_interacao, tipo_negocio
  `;
  return coerceOpportunity(rows[0]);
}

export async function updateOpportunity(
  id: string,
  updates: Partial<Omit<CazaCrmOpportunity, "id">>
): Promise<CazaCrmOpportunity | null> {
  if (!sql) return null;
  const rows = await sql`
    SELECT id, lead_id, nome_oportunidade, empresa, tipo_servico, valor_estimado,
           stage, probabilidade, owner, data_abertura, prazo_estimado,
           proxima_acao, data_proxima_acao, risco, motivo_perda, observacoes,
           data_ultima_interacao, tipo_negocio
    FROM caza_crm_opportunities WHERE id = ${id}
  `;
  if (!rows[0]) return null;
  const m = { ...coerceOpportunity(rows[0]), ...updates };
  const updated = await sql`
    UPDATE caza_crm_opportunities SET
      lead_id = ${m.lead_id ?? null}, nome_oportunidade = ${m.nome_oportunidade},
      empresa = ${m.empresa}, tipo_servico = ${m.tipo_servico},
      valor_estimado = ${m.valor_estimado}, stage = ${m.stage},
      probabilidade = ${m.probabilidade}, owner = ${m.owner},
      prazo_estimado = ${m.prazo_estimado ?? null}, proxima_acao = ${m.proxima_acao},
      data_proxima_acao = ${m.data_proxima_acao ?? null}, risco = ${m.risco},
      motivo_perda = ${m.motivo_perda}, observacoes = ${m.observacoes},
      data_ultima_interacao = ${m.data_ultima_interacao ?? null},
      tipo_negocio = ${m.tipo_negocio}
    WHERE id = ${id}
    RETURNING id, lead_id, nome_oportunidade, empresa, tipo_servico, valor_estimado,
              stage, probabilidade, owner, data_abertura, prazo_estimado,
              proxima_acao, data_proxima_acao, risco, motivo_perda, observacoes,
              data_ultima_interacao, tipo_negocio
  `;
  return updated[0] ? coerceOpportunity(updated[0]) : null;
}

// ─── Proposals ────────────────────────────────────────────────────────────────

export async function listProposals(): Promise<CazaCrmProposal[]> {
  if (!sql) return [];
  const rows = await sql`
    SELECT id, opportunity_id, versao, valor_proposto, escopo,
           status, data_envio, data_resposta, validade, objecoes, observacoes
    FROM caza_crm_proposals ORDER BY created_at DESC
  `;
  return rows.map(coerceProposal);
}

export async function createProposal(
  p: Omit<CazaCrmProposal, "id">
): Promise<CazaCrmProposal> {
  if (!sql) throw new Error("DB not available");
  const id = newProposalId();
  const rows = await sql`
    INSERT INTO caza_crm_proposals (
      id, opportunity_id, versao, valor_proposto, escopo,
      status, data_envio, data_resposta, validade, objecoes, observacoes
    ) VALUES (
      ${id}, ${p.opportunity_id}, ${p.versao}, ${p.valor_proposto},
      ${p.escopo}, ${p.status}, ${p.data_envio ?? null},
      ${p.data_resposta ?? null}, ${p.validade ?? null}, ${p.objecoes}, ${p.observacoes}
    ) RETURNING id, opportunity_id, versao, valor_proposto, escopo,
                status, data_envio, data_resposta, validade, objecoes, observacoes
  `;
  return coerceProposal(rows[0]);
}

export async function updateProposal(
  id: string,
  updates: Partial<Omit<CazaCrmProposal, "id">>
): Promise<CazaCrmProposal | null> {
  if (!sql) return null;
  const rows = await sql`
    SELECT id, opportunity_id, versao, valor_proposto, escopo,
           status, data_envio, data_resposta, validade, objecoes, observacoes
    FROM caza_crm_proposals WHERE id = ${id}
  `;
  if (!rows[0]) return null;
  const m = { ...coerceProposal(rows[0]), ...updates };
  const updated = await sql`
    UPDATE caza_crm_proposals SET
      versao = ${m.versao}, valor_proposto = ${m.valor_proposto},
      escopo = ${m.escopo}, status = ${m.status},
      data_envio = ${m.data_envio ?? null}, data_resposta = ${m.data_resposta ?? null},
      validade = ${m.validade ?? null}, objecoes = ${m.objecoes},
      observacoes = ${m.observacoes}
    WHERE id = ${id}
    RETURNING id, opportunity_id, versao, valor_proposto, escopo,
              status, data_envio, data_resposta, validade, objecoes, observacoes
  `;
  return updated[0] ? coerceProposal(updated[0]) : null;
}

export async function deleteLead(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM caza_crm_leads WHERE id = ${id}`;
}

export async function deleteOpportunity(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM caza_crm_opportunities WHERE id = ${id}`;
}

export async function deleteProposal(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM caza_crm_proposals WHERE id = ${id}`;
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export async function listInteractions(entidade_id?: string): Promise<CazaCrmInteraction[]> {
  if (!sql) return [];
  const rows = entidade_id
    ? await sql`
        SELECT id, entidade_tipo, entidade_id, tipo, descricao, owner, data, observacoes
        FROM caza_crm_interactions
        WHERE entidade_id = ${entidade_id}
        ORDER BY created_at DESC
      `
    : await sql`
        SELECT id, entidade_tipo, entidade_id, tipo, descricao, owner, data, observacoes
        FROM caza_crm_interactions
        ORDER BY created_at DESC LIMIT 100
      `;
  return rows.map(coerceInteraction);
}

export async function createInteraction(
  i: Omit<CazaCrmInteraction, "id">
): Promise<CazaCrmInteraction> {
  if (!sql) throw new Error("DB not available");
  const id = newInteractionId();
  const rows = await sql`
    INSERT INTO caza_crm_interactions (
      id, entidade_tipo, entidade_id, tipo, descricao, owner, data, observacoes
    ) VALUES (
      ${id}, ${i.entidade_tipo}, ${i.entidade_id}, ${i.tipo},
      ${i.descricao}, ${i.owner}, ${i.data}, ${i.observacoes}
    ) RETURNING id, entidade_tipo, entidade_id, tipo, descricao, owner, data, observacoes
  `;
  return coerceInteraction(rows[0]);
}

// ─── Coercions (DB rows → typed objects) ──────────────────────────────────────

function coerceLead(r: Record<string, unknown>): CazaCrmLead {
  return {
    id:                    String(r.id ?? ""),
    nome:                  String(r.nome ?? ""),
    cargo:                 String(r.cargo ?? ""),
    empresa:               String(r.empresa ?? ""),
    cnpj:                  String(r.cnpj ?? ""),
    contato_principal:     String(r.contato_principal ?? ""),
    telefone:              String(r.telefone ?? ""),
    email:                 String(r.email ?? ""),
    origem:                String(r.origem ?? ""),
    tipo_servico:          String(r.tipo_servico ?? ""),
    interesse:             String(r.interesse ?? ""),
    status:                String(r.status ?? "Novo"),
    owner:                 String(r.owner ?? ""),
    data_entrada:          String(r.data_entrada ?? ""),
    observacoes:           String(r.observacoes ?? ""),
    fit_icp:               String(r.fit_icp ?? ""),
    decisor:               String(r.decisor ?? ""),
    urgencia:              String(r.urgencia ?? ""),
    dor_principal:         String(r.dor_principal ?? ""),
    cidade:                String(r.cidade ?? ""),
    estagio_consciencia:   String(r.estagio_consciencia ?? ""),
    data_ultima_interacao: r.data_ultima_interacao != null ? String(r.data_ultima_interacao) : null,
    data_proxima_acao_crm: r.data_proxima_acao_crm != null ? String(r.data_proxima_acao_crm) : null,
    tipo_negocio:          String(r.tipo_negocio ?? ""),
  };
}

function coerceOpportunity(r: Record<string, unknown>): CazaCrmOpportunity {
  return {
    id:                    String(r.id ?? ""),
    lead_id:               r.lead_id != null ? String(r.lead_id) : null,
    nome_oportunidade:     String(r.nome_oportunidade ?? ""),
    empresa:               String(r.empresa ?? ""),
    tipo_servico:          String(r.tipo_servico ?? ""),
    valor_estimado:        Number(r.valor_estimado ?? 0),
    stage:                 String(r.stage ?? "Lead Captado"),
    probabilidade:         Number(r.probabilidade ?? 0),
    owner:                 String(r.owner ?? ""),
    data_abertura:         String(r.data_abertura ?? ""),
    prazo_estimado:        r.prazo_estimado != null ? String(r.prazo_estimado) : null,
    proxima_acao:          String(r.proxima_acao ?? ""),
    data_proxima_acao:     r.data_proxima_acao != null ? String(r.data_proxima_acao) : null,
    risco:                 String(r.risco ?? "Baixo"),
    motivo_perda:          String(r.motivo_perda ?? ""),
    observacoes:           String(r.observacoes ?? ""),
    data_ultima_interacao: r.data_ultima_interacao != null ? String(r.data_ultima_interacao) : null,
    tipo_negocio:          String(r.tipo_negocio ?? ""),
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
    data_envio:     r.data_envio     != null ? String(r.data_envio)     : null,
    data_resposta:  r.data_resposta  != null ? String(r.data_resposta)  : null,
    validade:       r.validade       != null ? String(r.validade)       : null,
    objecoes:       String(r.objecoes ?? ""),
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
