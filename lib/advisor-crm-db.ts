// ─── ADVISOR CRM — Database Layer ─────────────────────────────────────────────
//
// FONTE CANÔNICA: Neon Postgres (Vercel). Seed data quando DB indisponível.
//
// Entidades:
//   advisor_crm_leads          — prospecção de novos clientes de consultoria
//   advisor_crm_opportunities  — oportunidades comerciais (mandatos, projetos)
//   advisor_crm_interactions   — histórico de interações (timeline)
//
// Separado de advisor_clients (carteira de clientes ativos).
// Zero imports de outras BUs — isolamento total.

import { sql } from "@/lib/db";
import { randomUUID } from "crypto";

// ─── Enumerações ──────────────────────────────────────────────────────────────

export const ADVISOR_PIPELINE_STAGES = [
  "Novo Lead",
  "Qualificação",
  "Diagnóstico Inicial",
  "Proposta de Mandato",
  "Negociação",
  "Fechado Ganho",
  "Fechado Perdido",
] as const;

export const ADVISOR_SERVICE_TYPES = [
  "Gestão Patrimonial",
  "Consultoria Estratégica",
  "Planejamento Financeiro",
  "Reestruturação Societária",
  "Advisory M&A",
  "Governança Corporativa",
  "Outro",
] as const;

export const ADVISOR_LEAD_ORIGENS = [
  "Indicação",
  "Rede de Relacionamentos",
  "Evento",
  "LinkedIn",
  "WhatsApp",
  "Prospecção Ativa",
  "Outro",
] as const;

export const ADVISOR_LEAD_STATUSES = [
  "Novo",
  "Qualificando",
  "Convertido",
  "Perdido",
  "Nurturing",
] as const;

export const ADVISOR_INTERACTION_TYPES = [
  "Ligação",
  "Reunião",
  "WhatsApp",
  "E-mail",
  "Almoço/Jantar",
  "Follow-up",
  "Proposta Enviada",
  "Alinhamento Interno",
  "Observação",
] as const;

export const ADVISOR_RISK_LEVELS = ["Baixo", "Médio", "Alto"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdvisorCrmLead = {
  id: string;
  nome: string;
  cargo: string;
  empresa: string;
  segmento: string;
  contato_principal: string;
  telefone: string;
  email: string;
  origem: string;
  tipo_servico: string;
  aum_estimado: number | null;
  interesse: string;
  status: string;
  owner: string;
  data_entrada: string;
  observacoes: string;
};

export type AdvisorCrmOpportunity = {
  id: string;
  lead_id: string | null;
  nome_oportunidade: string;
  empresa: string;
  segmento: string;
  tipo_servico: string;
  fee_estimado_mensal: number;
  aum_potencial: number | null;
  stage: string;
  probabilidade: number;
  owner: string;
  data_abertura: string;
  data_fechamento_prevista: string | null;
  proxima_acao: string;
  data_proxima_acao: string | null;
  risco: string;
  motivo_perda: string;
  observacoes: string;
};

export type AdvisorCrmInteraction = {
  id: string;
  lead_id: string | null;
  opportunity_id: string | null;
  cliente_id: string | null;
  tipo: string;
  resumo: string;
  proximo_passo: string;
  owner: string;
  data: string;
  observacoes: string;
};

// ─── Seed Data (fallback sem DB) ──────────────────────────────────────────────

function dAgo(n: number) { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10); }
function dAhd(n: number) { return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10); }

export const SEED_ADVISOR_LEADS: AdvisorCrmLead[] = [
  {
    id: "ADV-LEAD-001",
    nome: "Dr. Roberto Silva",
    cargo: "Diretor Médico",
    empresa: "Reabilicor Clínica Cardíaca",
    segmento: "Saúde",
    contato_principal: "dr.roberto@reabilicor.com.br",
    telefone: "21 9000-1001",
    email: "roberto@reabilicor.com.br",
    origem: "Indicação",
    tipo_servico: "Consultoria Estratégica",
    aum_estimado: null,
    interesse: "Reestruturação operacional e expansão",
    status: "Qualificando",
    owner: "Danilo",
    data_entrada: dAgo(45),
    observacoes: "Clínica com potencial de expansão para RJ. Interesse em governança.",
  },
  {
    id: "ADV-LEAD-002",
    nome: "Dra. Sandra Lima",
    cargo: "Sócia",
    empresa: "HealthFirst Clínicas",
    segmento: "Saúde",
    contato_principal: "sandra@healthfirst.com.br",
    telefone: "21 9888-0002",
    email: "sandra@healthfirst.com.br",
    origem: "Indicação",
    tipo_servico: "Gestão Patrimonial",
    aum_estimado: 2000000,
    interesse: "Planejamento patrimonial e sucessório",
    status: "Novo",
    owner: "Danilo",
    data_entrada: dAgo(20),
    observacoes: "Indicada por Dr. Roberto. Perfil de alto patrimônio.",
  },
  {
    id: "ADV-LEAD-003",
    nome: "Paulo Mendonça",
    cargo: "CEO",
    empresa: "Grupo Mendonça Agro",
    segmento: "Agronegócio",
    contato_principal: "paulo@mendonca.agro.br",
    telefone: "67 9000-5050",
    email: "paulo@mendonca.agro.br",
    origem: "Rede de Relacionamentos",
    tipo_servico: "Advisory M&A",
    aum_estimado: 15000000,
    interesse: "Assessoria para venda parcial do grupo",
    status: "Nurturing",
    owner: "Miguel",
    data_entrada: dAgo(90),
    observacoes: "Processo de venda em estágio inicial. Follow-up trimestral.",
  },
];

export const SEED_ADVISOR_OPPORTUNITIES: AdvisorCrmOpportunity[] = [
  {
    id: "ADV-OPP-001",
    lead_id: "ADV-LEAD-001",
    nome_oportunidade: "Reabilicor — Consultoria Estratégica",
    empresa: "Reabilicor Clínica Cardíaca",
    segmento: "Saúde",
    tipo_servico: "Consultoria Estratégica",
    fee_estimado_mensal: 8000,
    aum_potencial: null,
    stage: "Negociação",
    probabilidade: 70,
    owner: "Danilo",
    data_abertura: dAgo(40),
    data_fechamento_prevista: dAhd(15),
    proxima_acao: "Enviar proposta revisada com cronograma detalhado",
    data_proxima_acao: dAhd(3),
    risco: "Médio",
    motivo_perda: "",
    observacoes: "Cliente quer contrato de 12 meses com cláusula de saída em 6.",
  },
  {
    id: "ADV-OPP-002",
    lead_id: "ADV-LEAD-002",
    nome_oportunidade: "HealthFirst — Planejamento Patrimonial",
    empresa: "HealthFirst Clínicas",
    segmento: "Saúde",
    tipo_servico: "Gestão Patrimonial",
    fee_estimado_mensal: 3500,
    aum_potencial: 2000000,
    stage: "Diagnóstico Inicial",
    probabilidade: 50,
    owner: "Danilo",
    data_abertura: dAgo(15),
    data_fechamento_prevista: dAhd(45),
    proxima_acao: "Agendar reunião de diagnóstico patrimonial completo",
    data_proxima_acao: dAhd(7),
    risco: "Baixo",
    motivo_perda: "",
    observacoes: "Perfil PF/PJ misto. Necessário análise de holding.",
  },
];

export const SEED_ADVISOR_INTERACTIONS: AdvisorCrmInteraction[] = [
  {
    id: "ADV-INT-001",
    lead_id: "ADV-LEAD-001",
    opportunity_id: "ADV-OPP-001",
    cliente_id: null,
    tipo: "Reunião",
    resumo: "Reunião de diagnóstico inicial na clínica. Levantamento de processos e necessidades de reestruturação.",
    proximo_passo: "Elaborar proposta de mandato de consultoria",
    owner: "Danilo",
    data: dAgo(35),
    observacoes: "Presença de dois sócios. Interesse confirmado.",
  },
  {
    id: "ADV-INT-002",
    lead_id: "ADV-LEAD-001",
    opportunity_id: "ADV-OPP-001",
    cliente_id: null,
    tipo: "Proposta Enviada",
    resumo: "Proposta de mandato de consultoria estratégica enviada por e-mail.",
    proximo_passo: "Aguardar feedback e agendar call de negociação",
    owner: "Danilo",
    data: dAgo(20),
    observacoes: "Proposta inclui diagnóstico + acompanhamento mensal.",
  },
  {
    id: "ADV-INT-003",
    lead_id: "ADV-LEAD-002",
    opportunity_id: "ADV-OPP-002",
    cliente_id: null,
    tipo: "Ligação",
    resumo: "Primeiro contato via telefone. Interesse confirmado em planejamento patrimonial e sucessório.",
    proximo_passo: "Enviar questionário de perfil de investidor",
    owner: "Danilo",
    data: dAgo(12),
    observacoes: "Indicação de Dr. Roberto confirmada na ligação.",
  },
];

// ─── Schema bootstrap (idempotente) ──────────────────────────────────────────

export async function initAdvisorCrmDB(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS advisor_crm_leads (
      id                  TEXT PRIMARY KEY,
      nome                TEXT NOT NULL DEFAULT '',
      cargo               TEXT NOT NULL DEFAULT '',
      empresa             TEXT NOT NULL DEFAULT '',
      segmento            TEXT NOT NULL DEFAULT '',
      contato_principal   TEXT NOT NULL DEFAULT '',
      telefone            TEXT NOT NULL DEFAULT '',
      email               TEXT NOT NULL DEFAULT '',
      origem              TEXT NOT NULL DEFAULT 'Indicação',
      tipo_servico        TEXT NOT NULL DEFAULT '',
      aum_estimado        NUMERIC,
      interesse           TEXT NOT NULL DEFAULT '',
      status              TEXT NOT NULL DEFAULT 'Novo',
      owner               TEXT NOT NULL DEFAULT '',
      data_entrada        TEXT NOT NULL DEFAULT '',
      observacoes         TEXT NOT NULL DEFAULT '',
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS advisor_crm_opportunities (
      id                       TEXT PRIMARY KEY,
      lead_id                  TEXT,
      nome_oportunidade        TEXT NOT NULL DEFAULT '',
      empresa                  TEXT NOT NULL DEFAULT '',
      segmento                 TEXT NOT NULL DEFAULT '',
      tipo_servico             TEXT NOT NULL DEFAULT '',
      fee_estimado_mensal      NUMERIC NOT NULL DEFAULT 0,
      aum_potencial            NUMERIC,
      stage                    TEXT NOT NULL DEFAULT 'Novo Lead',
      probabilidade            INTEGER NOT NULL DEFAULT 20,
      owner                    TEXT NOT NULL DEFAULT '',
      data_abertura            TEXT NOT NULL DEFAULT '',
      data_fechamento_prevista TEXT,
      proxima_acao             TEXT NOT NULL DEFAULT '',
      data_proxima_acao        TEXT,
      risco                    TEXT NOT NULL DEFAULT 'Baixo',
      motivo_perda             TEXT NOT NULL DEFAULT '',
      observacoes              TEXT NOT NULL DEFAULT '',
      created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS advisor_crm_interactions (
      id              TEXT PRIMARY KEY,
      lead_id         TEXT,
      opportunity_id  TEXT,
      cliente_id      TEXT,
      tipo            TEXT NOT NULL DEFAULT 'Ligação',
      resumo          TEXT NOT NULL DEFAULT '',
      proximo_passo   TEXT NOT NULL DEFAULT '',
      owner           TEXT NOT NULL DEFAULT '',
      data            TEXT NOT NULL DEFAULT '',
      observacoes     TEXT NOT NULL DEFAULT '',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_adv_crm_leads_status  ON advisor_crm_leads(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_adv_crm_leads_created  ON advisor_crm_leads(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_adv_crm_opps_stage    ON advisor_crm_opportunities(stage)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_adv_crm_opps_created  ON advisor_crm_opportunities(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_adv_crm_int_lead      ON advisor_crm_interactions(lead_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_adv_crm_int_opp       ON advisor_crm_interactions(opportunity_id)`;
}

// ─── ID helpers ───────────────────────────────────────────────────────────────

export const newAdvisorLeadId        = () => `ADV-LEAD-${randomUUID().slice(0, 6).toUpperCase()}`;
export const newAdvisorOpportunityId = () => `ADV-OPP-${randomUUID().slice(0, 6).toUpperCase()}`;
export const newAdvisorInteractionId = () => `ADV-INT-${randomUUID().slice(0, 6).toUpperCase()}`;

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function listAdvisorCrmLeads(filters?: { status?: string; owner?: string }): Promise<AdvisorCrmLead[]> {
  if (!sql) {
    let rows = [...SEED_ADVISOR_LEADS];
    if (filters?.status) rows = rows.filter(r => r.status === filters.status);
    if (filters?.owner)  rows = rows.filter(r => r.owner === filters.owner);
    return rows;
  }
  await initAdvisorCrmDB();
  const rows = await sql`
    SELECT id, nome, cargo, empresa, segmento, contato_principal, telefone, email,
           origem, tipo_servico, aum_estimado, interesse, status, owner,
           data_entrada, observacoes
    FROM advisor_crm_leads
    WHERE (${filters?.status ?? null}::text IS NULL OR status = ${filters?.status ?? null})
      AND (${filters?.owner  ?? null}::text IS NULL OR owner  = ${filters?.owner  ?? null})
    ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as AdvisorCrmLead[]) : SEED_ADVISOR_LEADS;
}

export async function createAdvisorCrmLead(data: Omit<AdvisorCrmLead, "id">): Promise<AdvisorCrmLead> {
  if (!sql) throw new Error("DB unavailable");
  await initAdvisorCrmDB();
  const id = newAdvisorLeadId();
  const [row] = await sql`
    INSERT INTO advisor_crm_leads
      (id, nome, cargo, empresa, segmento, contato_principal, telefone, email,
       origem, tipo_servico, aum_estimado, interesse, status, owner, data_entrada, observacoes)
    VALUES
      (${id}, ${data.nome}, ${data.cargo}, ${data.empresa}, ${data.segmento},
       ${data.contato_principal}, ${data.telefone}, ${data.email}, ${data.origem},
       ${data.tipo_servico}, ${data.aum_estimado ?? null}, ${data.interesse},
       ${data.status}, ${data.owner}, ${data.data_entrada}, ${data.observacoes})
    RETURNING id, nome, cargo, empresa, segmento, contato_principal, telefone, email,
              origem, tipo_servico, aum_estimado, interesse, status, owner,
              data_entrada, observacoes
  `;
  return row as unknown as AdvisorCrmLead;
}

export async function updateAdvisorCrmLead(
  id: string,
  updates: Partial<Omit<AdvisorCrmLead, "id">>
): Promise<AdvisorCrmLead | null> {
  if (!sql) return null;
  await initAdvisorCrmDB();
  const [row] = await sql`
    UPDATE advisor_crm_leads SET
      nome              = COALESCE(${updates.nome              ?? null}, nome),
      cargo             = COALESCE(${updates.cargo             ?? null}, cargo),
      empresa           = COALESCE(${updates.empresa           ?? null}, empresa),
      segmento          = COALESCE(${updates.segmento          ?? null}, segmento),
      tipo_servico      = COALESCE(${updates.tipo_servico      ?? null}, tipo_servico),
      aum_estimado      = COALESCE(${updates.aum_estimado      ?? null}, aum_estimado),
      status            = COALESCE(${updates.status            ?? null}, status),
      owner             = COALESCE(${updates.owner             ?? null}, owner),
      proxima_acao      = COALESCE(${(updates as Record<string, unknown>).proxima_acao ?? null}, observacoes),
      observacoes       = COALESCE(${updates.observacoes       ?? null}, observacoes)
    WHERE id = ${id}
    RETURNING id, nome, cargo, empresa, segmento, contato_principal, telefone, email,
              origem, tipo_servico, aum_estimado, interesse, status, owner,
              data_entrada, observacoes
  `;
  return row ? (row as unknown as AdvisorCrmLead) : null;
}

export async function deleteAdvisorCrmLead(id: string): Promise<boolean> {
  if (!sql) return false;
  await initAdvisorCrmDB();
  await sql`DELETE FROM advisor_crm_leads WHERE id = ${id}`;
  return true;
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function listAdvisorCrmOpportunities(filters?: { stage?: string; owner?: string }): Promise<AdvisorCrmOpportunity[]> {
  if (!sql) {
    let rows = [...SEED_ADVISOR_OPPORTUNITIES];
    if (filters?.stage) rows = rows.filter(r => r.stage === filters.stage);
    if (filters?.owner) rows = rows.filter(r => r.owner === filters.owner);
    return rows;
  }
  await initAdvisorCrmDB();
  const rows = await sql`
    SELECT id, lead_id, nome_oportunidade, empresa, segmento, tipo_servico,
           fee_estimado_mensal, aum_potencial, stage, probabilidade, owner,
           data_abertura, data_fechamento_prevista, proxima_acao, data_proxima_acao,
           risco, motivo_perda, observacoes
    FROM advisor_crm_opportunities
    WHERE (${filters?.stage ?? null}::text IS NULL OR stage = ${filters?.stage ?? null})
      AND (${filters?.owner ?? null}::text IS NULL OR owner = ${filters?.owner ?? null})
    ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as AdvisorCrmOpportunity[]) : SEED_ADVISOR_OPPORTUNITIES;
}

export async function createAdvisorCrmOpportunity(data: Omit<AdvisorCrmOpportunity, "id">): Promise<AdvisorCrmOpportunity> {
  if (!sql) throw new Error("DB unavailable");
  await initAdvisorCrmDB();
  const id = newAdvisorOpportunityId();
  const [row] = await sql`
    INSERT INTO advisor_crm_opportunities
      (id, lead_id, nome_oportunidade, empresa, segmento, tipo_servico,
       fee_estimado_mensal, aum_potencial, stage, probabilidade, owner,
       data_abertura, data_fechamento_prevista, proxima_acao, data_proxima_acao,
       risco, motivo_perda, observacoes)
    VALUES
      (${id}, ${data.lead_id ?? null}, ${data.nome_oportunidade}, ${data.empresa},
       ${data.segmento}, ${data.tipo_servico}, ${data.fee_estimado_mensal},
       ${data.aum_potencial ?? null}, ${data.stage}, ${data.probabilidade},
       ${data.owner}, ${data.data_abertura}, ${data.data_fechamento_prevista ?? null},
       ${data.proxima_acao}, ${data.data_proxima_acao ?? null}, ${data.risco},
       ${data.motivo_perda}, ${data.observacoes})
    RETURNING id, lead_id, nome_oportunidade, empresa, segmento, tipo_servico,
              fee_estimado_mensal, aum_potencial, stage, probabilidade, owner,
              data_abertura, data_fechamento_prevista, proxima_acao, data_proxima_acao,
              risco, motivo_perda, observacoes
  `;
  return row as unknown as AdvisorCrmOpportunity;
}

export async function updateAdvisorCrmOpportunity(
  id: string,
  updates: Partial<Omit<AdvisorCrmOpportunity, "id">>
): Promise<AdvisorCrmOpportunity | null> {
  if (!sql) return null;
  await initAdvisorCrmDB();
  const [row] = await sql`
    UPDATE advisor_crm_opportunities SET
      stage                    = COALESCE(${updates.stage                    ?? null}, stage),
      probabilidade            = COALESCE(${updates.probabilidade            ?? null}, probabilidade),
      fee_estimado_mensal      = COALESCE(${updates.fee_estimado_mensal      ?? null}, fee_estimado_mensal),
      aum_potencial            = COALESCE(${updates.aum_potencial            ?? null}, aum_potencial),
      proxima_acao             = COALESCE(${updates.proxima_acao             ?? null}, proxima_acao),
      data_proxima_acao        = COALESCE(${updates.data_proxima_acao        ?? null}, data_proxima_acao),
      data_fechamento_prevista = COALESCE(${updates.data_fechamento_prevista ?? null}, data_fechamento_prevista),
      risco                    = COALESCE(${updates.risco                    ?? null}, risco),
      motivo_perda             = COALESCE(${updates.motivo_perda             ?? null}, motivo_perda),
      owner                    = COALESCE(${updates.owner                    ?? null}, owner),
      observacoes              = COALESCE(${updates.observacoes              ?? null}, observacoes)
    WHERE id = ${id}
    RETURNING id, lead_id, nome_oportunidade, empresa, segmento, tipo_servico,
              fee_estimado_mensal, aum_potencial, stage, probabilidade, owner,
              data_abertura, data_fechamento_prevista, proxima_acao, data_proxima_acao,
              risco, motivo_perda, observacoes
  `;
  return row ? (row as unknown as AdvisorCrmOpportunity) : null;
}

export async function deleteAdvisorCrmOpportunity(id: string): Promise<boolean> {
  if (!sql) return false;
  await initAdvisorCrmDB();
  await sql`DELETE FROM advisor_crm_opportunities WHERE id = ${id}`;
  return true;
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export async function listAdvisorCrmInteractions(filters?: {
  lead_id?: string;
  opportunity_id?: string;
  cliente_id?: string;
}): Promise<AdvisorCrmInteraction[]> {
  if (!sql) {
    let rows = [...SEED_ADVISOR_INTERACTIONS];
    if (filters?.lead_id)        rows = rows.filter(r => r.lead_id        === filters.lead_id);
    if (filters?.opportunity_id) rows = rows.filter(r => r.opportunity_id === filters.opportunity_id);
    if (filters?.cliente_id)     rows = rows.filter(r => r.cliente_id     === filters.cliente_id);
    return rows;
  }
  await initAdvisorCrmDB();
  const rows = await sql`
    SELECT id, lead_id, opportunity_id, cliente_id, tipo, resumo,
           proximo_passo, owner, data, observacoes
    FROM advisor_crm_interactions
    WHERE (${filters?.lead_id        ?? null}::text IS NULL OR lead_id        = ${filters?.lead_id        ?? null})
      AND (${filters?.opportunity_id ?? null}::text IS NULL OR opportunity_id = ${filters?.opportunity_id ?? null})
      AND (${filters?.cliente_id     ?? null}::text IS NULL OR cliente_id     = ${filters?.cliente_id     ?? null})
    ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as AdvisorCrmInteraction[]) : SEED_ADVISOR_INTERACTIONS;
}

export async function createAdvisorCrmInteraction(data: Omit<AdvisorCrmInteraction, "id">): Promise<AdvisorCrmInteraction> {
  if (!sql) throw new Error("DB unavailable");
  await initAdvisorCrmDB();
  const id = newAdvisorInteractionId();
  const [row] = await sql`
    INSERT INTO advisor_crm_interactions
      (id, lead_id, opportunity_id, cliente_id, tipo, resumo, proximo_passo, owner, data, observacoes)
    VALUES
      (${id}, ${data.lead_id ?? null}, ${data.opportunity_id ?? null},
       ${data.cliente_id ?? null}, ${data.tipo}, ${data.resumo},
       ${data.proximo_passo}, ${data.owner}, ${data.data}, ${data.observacoes})
    RETURNING id, lead_id, opportunity_id, cliente_id, tipo, resumo,
              proximo_passo, owner, data, observacoes
  `;
  return row as unknown as AdvisorCrmInteraction;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getAdvisorCrmStats() {
  const [leads, opps] = await Promise.all([
    listAdvisorCrmLeads(),
    listAdvisorCrmOpportunities(),
  ]);

  const openOpps = opps.filter(o => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido");
  const wonOpps  = opps.filter(o => o.stage === "Fechado Ganho");
  const closedAll = opps.filter(o => o.stage === "Fechado Ganho" || o.stage === "Fechado Perdido");

  return {
    totalLeads:       leads.length,
    leadsNovos:       leads.filter(l => l.status === "Novo").length,
    openOpportunities: openOpps.length,
    pipelineFeeTotal: openOpps.reduce((s, o) => s + o.fee_estimado_mensal * 12, 0),
    aumPotencial:     openOpps.reduce((s, o) => s + (o.aum_potencial ?? 0), 0),
    closedWon:        wonOpps.length,
    winRate:          closedAll.length > 0 ? Math.round(wonOpps.length / closedAll.length * 100) : 0,
  };
}
