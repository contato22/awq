// ─── AWQ Venture — CRM Database Layer ────────────────────────────────────────
//
// SOURCE OF TRUTH: Neon Postgres (Vercel).
// GitHub Pages: static JSON snapshots (read-only).
//
// Model de negócio: M4E (Media for Equity) — deals onde AWQ troca
// serviços de mídia/marketing por participação acionária.
//
// Tables — ISOLATED from other BU CRMs:
//   venture_crm_leads       — empresas em triagem inicial
//   venture_crm_deals       — deals de M4E em pipeline
//   venture_crm_contacts    — fundadores/contatos das empresas
//   venture_crm_interactions — histórico de interações
//
// Zero imports de outros CRMs — separação total de BU.

import { sql } from "@/lib/db";

// ─── Enumerações ──────────────────────────────────────────────────────────────

export const VENTURE_DEAL_STAGES = [
  "Triagem",
  "Prospecção",
  "Due Diligence",
  "Term Sheet",
  "Fechado",
  "Descartado",
] as const;

export const VENTURE_SECTORS = [
  "Energia / Utilities",
  "Foodtech / FoodService",
  "Healthtech / Saúde",
  "Edtech / Educação",
  "Fintech",
  "Agritech",
  "Proptech",
  "Logística / Supply Chain",
  "Media / Entretenimento",
  "SaaS / B2B Software",
  "E-commerce / Marketplace",
  "Outro",
] as const;

export const VENTURE_LEAD_STATUSES = [
  "Novo",
  "Em Análise",
  "Aprovado",
  "Rejeitado",
  "Aguardando",
] as const;

export const VENTURE_INTERACTION_TYPES = [
  "Reunião",
  "Pitch",
  "Due Diligence",
  "Ligação",
  "WhatsApp",
  "E-mail",
  "Apresentação",
  "Follow-up",
  "Observação",
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type VentureCrmLead = {
  id: string;
  nome_empresa: string;
  setor: string;
  estagio_empresa: string; // Pre-seed, Seed, Series A, etc.
  site: string;
  nome_fundador: string;
  email: string;
  telefone: string;
  origem: string;
  status: string;
  owner: string;
  data_entrada: string;
  pitch_url: string;
  observacoes: string;
};

export type VentureCrmDeal = {
  id: string;
  lead_id: string | null;
  nome_deal: string;
  empresa: string;
  setor: string;
  stage: string;
  ticket_midia: number;      // Valor de mídia a ser trocado (R$)
  equity_percentual: number; // % equity negociado
  valuation_pre: number;     // Valuation pré-money estimado (R$)
  eta: string;               // Quarter estimado para fechar (ex: "Q3 2026")
  score: number;             // Score interno AWQ Venture (0-10)
  owner: string;
  data_abertura: string;
  proxima_acao: string;
  data_proxima_acao: string | null;
  priority: string;          // Alta, Média, Baixa
  close_reason: string;
  observacoes: string;
};

export type VentureCrmContact = {
  id: string;
  deal_id: string | null;
  lead_id: string | null;
  nome: string;
  cargo: string;
  empresa: string;
  email: string;
  telefone: string;
  linkedin: string;
  role: string; // "Fundador", "Co-fundador", "CTO", etc.
  is_decision_maker: boolean;
  observacoes: string;
};

export type VentureCrmInteraction = {
  id: string;
  deal_id: string | null;
  lead_id: string | null;
  tipo: string;
  data: string;
  resumo: string;
  proximo_passo: string;
  responsavel: string;
  signal: string; // "Positivo", "Neutro", "Negativo"
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

export const SEED_LEADS: VentureCrmLead[] = [];
export const SEED_DEALS: VentureCrmDeal[] = [];
export const SEED_CONTACTS: VentureCrmContact[] = [];
export const SEED_INTERACTIONS: VentureCrmInteraction[] = [];

// ─── DB Init (idempotente) ────────────────────────────────────────────────────

export async function initVentureCrmDB(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS venture_crm_leads (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      nome_empresa    TEXT NOT NULL,
      setor           TEXT DEFAULT '',
      estagio_empresa TEXT DEFAULT '',
      site            TEXT DEFAULT '',
      nome_fundador   TEXT DEFAULT '',
      email           TEXT DEFAULT '',
      telefone        TEXT DEFAULT '',
      origem          TEXT DEFAULT 'Indicação',
      status          TEXT DEFAULT 'Novo',
      owner           TEXT DEFAULT '',
      data_entrada    DATE DEFAULT CURRENT_DATE,
      pitch_url       TEXT DEFAULT '',
      observacoes     TEXT DEFAULT '',
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS venture_crm_deals (
      id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      lead_id            TEXT,
      nome_deal          TEXT NOT NULL,
      empresa            TEXT DEFAULT '',
      setor              TEXT DEFAULT '',
      stage              TEXT DEFAULT 'Triagem',
      ticket_midia       NUMERIC DEFAULT 0,
      equity_percentual  NUMERIC DEFAULT 0,
      valuation_pre      NUMERIC DEFAULT 0,
      eta                TEXT DEFAULT '',
      score              NUMERIC DEFAULT 0,
      owner              TEXT DEFAULT '',
      data_abertura      DATE DEFAULT CURRENT_DATE,
      proxima_acao       TEXT DEFAULT '',
      data_proxima_acao  DATE,
      priority           TEXT DEFAULT 'Média',
      close_reason       TEXT DEFAULT '',
      observacoes        TEXT DEFAULT '',
      created_at         TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS venture_crm_contacts (
      id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      deal_id            TEXT,
      lead_id            TEXT,
      nome               TEXT NOT NULL,
      cargo              TEXT DEFAULT '',
      empresa            TEXT DEFAULT '',
      email              TEXT DEFAULT '',
      telefone           TEXT DEFAULT '',
      linkedin           TEXT DEFAULT '',
      role               TEXT DEFAULT 'Fundador',
      is_decision_maker  BOOLEAN DEFAULT TRUE,
      observacoes        TEXT DEFAULT '',
      created_at         TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS venture_crm_interactions (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      deal_id       TEXT,
      lead_id       TEXT,
      tipo          TEXT DEFAULT 'Reunião',
      data          DATE DEFAULT CURRENT_DATE,
      resumo        TEXT DEFAULT '',
      proximo_passo TEXT DEFAULT '',
      responsavel   TEXT DEFAULT '',
      signal        TEXT DEFAULT 'Neutro',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// ─── CRUD — Leads ─────────────────────────────────────────────────────────────

export async function listLeads(): Promise<VentureCrmLead[]> {
  if (!sql) return SEED_LEADS;
  await initVentureCrmDB();
  const rows = await sql`
    SELECT id, nome_empresa, setor, estagio_empresa, site, nome_fundador,
           email, telefone, origem, status, owner,
           data_entrada::text AS data_entrada, pitch_url, observacoes
    FROM venture_crm_leads ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as VentureCrmLead[]) : SEED_LEADS;
}

export async function createLead(data: Omit<VentureCrmLead, "id">): Promise<VentureCrmLead> {
  if (!sql) throw new Error("DB unavailable");
  await initVentureCrmDB();
  const [row] = await sql`
    INSERT INTO venture_crm_leads
      (nome_empresa, setor, estagio_empresa, site, nome_fundador, email,
       telefone, origem, status, owner, data_entrada, pitch_url, observacoes)
    VALUES
      (${data.nome_empresa}, ${data.setor}, ${data.estagio_empresa}, ${data.site},
       ${data.nome_fundador}, ${data.email}, ${data.telefone}, ${data.origem},
       ${data.status}, ${data.owner}, ${data.data_entrada}, ${data.pitch_url},
       ${data.observacoes})
    RETURNING id, nome_empresa, setor, estagio_empresa, site, nome_fundador,
              email, telefone, origem, status, owner,
              data_entrada::text AS data_entrada, pitch_url, observacoes
  `;
  return row as unknown as VentureCrmLead;
}

// ─── CRUD — Deals ─────────────────────────────────────────────────────────────

export async function listDeals(): Promise<VentureCrmDeal[]> {
  if (!sql) return SEED_DEALS;
  await initVentureCrmDB();
  const rows = await sql`
    SELECT id, lead_id, nome_deal, empresa, setor, stage,
           ticket_midia::float AS ticket_midia,
           equity_percentual::float AS equity_percentual,
           valuation_pre::float AS valuation_pre,
           eta, score::float AS score, owner,
           data_abertura::text AS data_abertura,
           proxima_acao,
           data_proxima_acao::text AS data_proxima_acao,
           priority, close_reason, observacoes
    FROM venture_crm_deals ORDER BY score DESC, created_at DESC
  `;
  return rows.length ? (rows as unknown as VentureCrmDeal[]) : SEED_DEALS;
}

export async function createDeal(data: Omit<VentureCrmDeal, "id">): Promise<VentureCrmDeal> {
  if (!sql) throw new Error("DB unavailable");
  await initVentureCrmDB();
  const [row] = await sql`
    INSERT INTO venture_crm_deals
      (lead_id, nome_deal, empresa, setor, stage, ticket_midia, equity_percentual,
       valuation_pre, eta, score, owner, data_abertura, proxima_acao,
       data_proxima_acao, priority, close_reason, observacoes)
    VALUES
      (${data.lead_id}, ${data.nome_deal}, ${data.empresa}, ${data.setor},
       ${data.stage}, ${data.ticket_midia}, ${data.equity_percentual},
       ${data.valuation_pre}, ${data.eta}, ${data.score}, ${data.owner},
       ${data.data_abertura}, ${data.proxima_acao}, ${data.data_proxima_acao},
       ${data.priority}, ${data.close_reason}, ${data.observacoes})
    RETURNING *
  `;
  return row as unknown as VentureCrmDeal;
}

// ─── CRUD — Contacts ──────────────────────────────────────────────────────────

export async function listContacts(): Promise<VentureCrmContact[]> {
  if (!sql) return SEED_CONTACTS;
  await initVentureCrmDB();
  const rows = await sql`
    SELECT id, deal_id, lead_id, nome, cargo, empresa, email, telefone,
           linkedin, role, is_decision_maker, observacoes
    FROM venture_crm_contacts ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as VentureCrmContact[]) : SEED_CONTACTS;
}

// ─── CRUD — Interactions ──────────────────────────────────────────────────────

export async function listInteractions(): Promise<VentureCrmInteraction[]> {
  if (!sql) return SEED_INTERACTIONS;
  await initVentureCrmDB();
  const rows = await sql`
    SELECT id, deal_id, lead_id, tipo, data::text AS data,
           resumo, proximo_passo, responsavel, signal
    FROM venture_crm_interactions ORDER BY data DESC, created_at DESC
  `;
  return rows.length ? (rows as unknown as VentureCrmInteraction[]) : SEED_INTERACTIONS;
}

export async function createInteraction(data: Omit<VentureCrmInteraction, "id">): Promise<VentureCrmInteraction> {
  if (!sql) throw new Error("DB unavailable");
  await initVentureCrmDB();
  const [row] = await sql`
    INSERT INTO venture_crm_interactions
      (deal_id, lead_id, tipo, data, resumo, proximo_passo, responsavel, signal)
    VALUES
      (${data.deal_id}, ${data.lead_id}, ${data.tipo}, ${data.data},
       ${data.resumo}, ${data.proximo_passo}, ${data.responsavel}, ${data.signal})
    RETURNING *
  `;
  return row as unknown as VentureCrmInteraction;
}
