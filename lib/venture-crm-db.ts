// ─── VENTURE CRM — Database Layer ─────────────────────────────────────────────
//
// FONTE CANÔNICA: Neon Postgres (Vercel). Seed data quando DB indisponível.
//
// Entidades:
//   venture_crm_opportunities  — pipeline comercial (advisory, M4E, fee+upside)
//   venture_crm_proposals      — propostas vinculadas a oportunidades
//   venture_crm_interactions   — histórico de interações (timeline)
//
// Migra os dados de lib/venture-commercial-data.ts para storage persistente.
// Zero imports de outras BUs — isolamento total.

import { sql } from "@/lib/db";
import { randomUUID } from "crypto";

// ─── Enumerações ──────────────────────────────────────────────────────────────

export const VENTURE_PIPELINE_STAGES = [
  "Oportunidade",
  "Proposta Enviada",
  "Negociação",
  "Contrato Ativo",
  "Fee Recorrente",
  "Upside Potencial",
  "Investimento/M4E",
  "Encerrado",
] as const;

export const VENTURE_DEAL_TYPES = [
  "Aquisição",
  "Participação/M4E",
  "Fee + Upside",
  "Consultoria Estratégica",
  "Operação Recorrente",
  "Parceria",
  "Oportunidade em Diligência",
  "Oportunidade Descartada",
  "Contrato Ativo",
] as const;

export const VENTURE_DATA_QUALITY = ["real", "estimado", "manual", "sem_dado"] as const;

export const VENTURE_PROPOSAL_STATUSES = [
  "Rascunho",
  "Pronto para Envio",
  "Enviado",
  "Em Negociação",
  "Aprovado",
  "Rejeitado",
] as const;

export const VENTURE_INTERACTION_TYPES = [
  "Ligação",
  "Reunião",
  "WhatsApp",
  "E-mail",
  "Follow-up",
  "Proposta Enviada",
  "Contraproposta",
  "Alinhamento Interno",
  "Observação",
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type VentureCrmOpportunity = {
  id: string;
  empresa: string;
  setor: string;
  origem: string;
  deal_type: string;
  stage: string;
  probabilidade: number;
  prioridade: "Alta" | "Média" | "Baixa";
  responsavel: string;
  fee_mensal: number | null;
  fee_mensal_quality: string;
  arr: number | null;
  arr_quality: string;
  contract_value: number | null;
  contract_value_quality: string;
  upside_pct: number | null;
  upside_type: string | null;
  upside_quality: string;
  valor_patrimonial_estimado: number | null;
  valor_patrimonial_quality: string;
  proxima_acao: string;
  deal_ref: string | null;
  notas_internas: string;
  last_updated: string;
};

export type VentureCrmProposal = {
  id: string;
  opportunity_id: string;
  versao: number;
  status: string;
  titulo: string;
  resumo_executivo: string;
  fee_mensal: number | null;
  fee_quality: string;
  duracao_contrato: string;
  descricao_upside: string;
  client_visible: boolean;
  enviado_em: string | null;
  observacoes: string;
};

export type VentureCrmInteraction = {
  id: string;
  opportunity_id: string | null;
  tipo: string;
  resumo: string;
  proximo_passo: string;
  responsavel: string;
  data: string;
  observacoes: string;
};

// ─── Seed Data (fallback sem DB) ──────────────────────────────────────────────

function dAgo(n: number) { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10); }
function dAhd(n: number) { return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10); }

export const SEED_VENTURE_OPPORTUNITIES: VentureCrmOpportunity[] = [
  {
    id: "VNT-OPP-C001",
    empresa: "ENERDY",
    setor: "Energia / Advisory",
    origem: "Contrato direto",
    deal_type: "Operação Recorrente",
    stage: "Fee Recorrente",
    probabilidade: 100,
    prioridade: "Alta",
    responsavel: "AWQ Venture",
    fee_mensal: 2000,
    fee_mensal_quality: "real",
    arr: 24000,
    arr_quality: "real",
    contract_value: 72000,
    contract_value_quality: "real",
    upside_pct: null,
    upside_type: null,
    upside_quality: "sem_dado",
    valor_patrimonial_estimado: null,
    valor_patrimonial_quality: "sem_dado",
    proxima_acao: "Confirmar data de início do contrato e agendar reunião de alinhamento estratégico",
    deal_ref: null,
    notas_internas: "Único contrato comercial ativo e confirmado da AWQ Venture. Fee mensal R$2.000 · 36 meses · Total R$72.000.",
    last_updated: dAgo(28),
  },
  {
    id: "VNT-OPP-P001",
    empresa: "Grupo Energético Nacional",
    setor: "Energia",
    origem: "Prospecção direta",
    deal_type: "Fee + Upside",
    stage: "Oportunidade",
    probabilidade: 30,
    prioridade: "Média",
    responsavel: "AWQ Venture",
    fee_mensal: null,
    fee_mensal_quality: "sem_dado",
    arr: null,
    arr_quality: "sem_dado",
    contract_value: null,
    contract_value_quality: "sem_dado",
    upside_pct: 5,
    upside_type: "equity",
    upside_quality: "estimado",
    valor_patrimonial_estimado: null,
    valor_patrimonial_quality: "sem_dado",
    proxima_acao: "Agendar reunião de apresentação institucional",
    deal_ref: null,
    notas_internas: "Oportunidade identificada via network. Sem proposta formal ainda.",
    last_updated: dAgo(60),
  },
  {
    id: "VNT-OPP-P002",
    empresa: "TechBridge Ventures",
    setor: "Tecnologia",
    origem: "Indicação",
    deal_type: "Participação/M4E",
    stage: "Proposta Enviada",
    probabilidade: 45,
    prioridade: "Alta",
    responsavel: "AWQ Venture",
    fee_mensal: 5000,
    fee_mensal_quality: "estimado",
    arr: 60000,
    arr_quality: "estimado",
    contract_value: null,
    contract_value_quality: "sem_dado",
    upside_pct: 10,
    upside_type: "equity",
    upside_quality: "estimado",
    valor_patrimonial_estimado: 500000,
    valor_patrimonial_quality: "estimado",
    proxima_acao: "Aguardar feedback da proposta e agendar call de negociação",
    deal_ref: null,
    notas_internas: "Startup de tecnologia buscando gestão estratégica. M4E com equity de 10%.",
    last_updated: dAgo(15),
  },
];

export const SEED_VENTURE_PROPOSALS: VentureCrmProposal[] = [
  {
    id: "VNT-PROP-C001-v1",
    opportunity_id: "VNT-OPP-C001",
    versao: 1,
    status: "Aprovado",
    titulo: "Proposta de Advisory — AWQ Venture × ENERDY",
    resumo_executivo: "Contratação da AWQ Venture como advisor estratégico e parceiro de incubação operacional do Grupo ENERDY, com fee mensal de R$2.000 pelo período de 36 meses.",
    fee_mensal: 2000,
    fee_quality: "real",
    duracao_contrato: "36 meses",
    descricao_upside: "",
    client_visible: true,
    enviado_em: dAgo(28),
    observacoes: "Contrato assinado. Proposta aprovada pelo cliente.",
  },
  {
    id: "VNT-PROP-P002-v1",
    opportunity_id: "VNT-OPP-P002",
    versao: 1,
    status: "Enviado",
    titulo: "Proposta M4E — AWQ Venture × TechBridge Ventures",
    resumo_executivo: "Parceria de gestão estratégica (Management for Equity) com fee mensal de R$5.000 e participação de 10% no equity da empresa.",
    fee_mensal: 5000,
    fee_quality: "estimado",
    duracao_contrato: "24 meses + renovação",
    descricao_upside: "10% de participação no capital da TechBridge Ventures mediante vesting de 24 meses.",
    client_visible: true,
    enviado_em: dAgo(15),
    observacoes: "Aguardando resposta do cliente.",
  },
];

export const SEED_VENTURE_INTERACTIONS: VentureCrmInteraction[] = [
  {
    id: "VNT-INT-001",
    opportunity_id: "VNT-OPP-C001",
    tipo: "Reunião",
    resumo: "Reunião de fechamento de contrato com ENERDY. Assinatura digital confirmada.",
    proximo_passo: "Onboarding operacional e primeiro alinhamento estratégico",
    responsavel: "AWQ Venture",
    data: dAgo(28),
    observacoes: "Contrato de 36 meses. Fee R$2.000/mês confirmado.",
  },
  {
    id: "VNT-INT-002",
    opportunity_id: "VNT-OPP-P002",
    tipo: "Proposta Enviada",
    resumo: "Proposta de M4E enviada para TechBridge Ventures com termos de equity e fee.",
    proximo_passo: "Aguardar feedback e agendar call de negociação",
    responsavel: "AWQ Venture",
    data: dAgo(15),
    observacoes: "Proposta inclui estrutura de vesting e governança.",
  },
  {
    id: "VNT-INT-003",
    opportunity_id: "VNT-OPP-P001",
    tipo: "Ligação",
    resumo: "Primeiro contato com Grupo Energético Nacional. Apresentação institucional da AWQ Venture.",
    proximo_passo: "Enviar deck de apresentação e agendar reunião presencial",
    responsavel: "AWQ Venture",
    data: dAgo(60),
    observacoes: "Interesse inicial confirmado. Oportunidade em fase muito inicial.",
  },
];

// ─── Schema bootstrap (idempotente) ──────────────────────────────────────────

export async function initVentureCrmDB(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS venture_crm_opportunities (
      id                          TEXT PRIMARY KEY,
      empresa                     TEXT NOT NULL DEFAULT '',
      setor                       TEXT NOT NULL DEFAULT '',
      origem                      TEXT NOT NULL DEFAULT '',
      deal_type                   TEXT NOT NULL DEFAULT 'Oportunidade em Diligência',
      stage                       TEXT NOT NULL DEFAULT 'Oportunidade',
      probabilidade               INTEGER NOT NULL DEFAULT 0,
      prioridade                  TEXT NOT NULL DEFAULT 'Média',
      responsavel                 TEXT NOT NULL DEFAULT 'AWQ Venture',
      fee_mensal                  NUMERIC,
      fee_mensal_quality          TEXT NOT NULL DEFAULT 'sem_dado',
      arr                         NUMERIC,
      arr_quality                 TEXT NOT NULL DEFAULT 'sem_dado',
      contract_value              NUMERIC,
      contract_value_quality      TEXT NOT NULL DEFAULT 'sem_dado',
      upside_pct                  NUMERIC,
      upside_type                 TEXT,
      upside_quality              TEXT NOT NULL DEFAULT 'sem_dado',
      valor_patrimonial_estimado  NUMERIC,
      valor_patrimonial_quality   TEXT NOT NULL DEFAULT 'sem_dado',
      proxima_acao                TEXT NOT NULL DEFAULT '',
      deal_ref                    TEXT,
      notas_internas              TEXT NOT NULL DEFAULT '',
      last_updated                TEXT NOT NULL DEFAULT '',
      created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS venture_crm_proposals (
      id              TEXT PRIMARY KEY,
      opportunity_id  TEXT NOT NULL DEFAULT '',
      versao          INTEGER NOT NULL DEFAULT 1,
      status          TEXT NOT NULL DEFAULT 'Rascunho',
      titulo          TEXT NOT NULL DEFAULT '',
      resumo_executivo TEXT NOT NULL DEFAULT '',
      fee_mensal      NUMERIC,
      fee_quality     TEXT NOT NULL DEFAULT 'sem_dado',
      duracao_contrato TEXT NOT NULL DEFAULT '',
      descricao_upside TEXT NOT NULL DEFAULT '',
      client_visible  BOOLEAN NOT NULL DEFAULT FALSE,
      enviado_em      TEXT,
      observacoes     TEXT NOT NULL DEFAULT '',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS venture_crm_interactions (
      id              TEXT PRIMARY KEY,
      opportunity_id  TEXT,
      tipo            TEXT NOT NULL DEFAULT 'Ligação',
      resumo          TEXT NOT NULL DEFAULT '',
      proximo_passo   TEXT NOT NULL DEFAULT '',
      responsavel     TEXT NOT NULL DEFAULT 'AWQ Venture',
      data            TEXT NOT NULL DEFAULT '',
      observacoes     TEXT NOT NULL DEFAULT '',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_vntr_crm_opps_stage    ON venture_crm_opportunities(stage)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vntr_crm_opps_created  ON venture_crm_opportunities(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vntr_crm_props_opp     ON venture_crm_proposals(opportunity_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vntr_crm_int_opp       ON venture_crm_interactions(opportunity_id)`;
}

// ─── ID helpers ───────────────────────────────────────────────────────────────

export const newVentureOpportunityId = () => `VNT-OPP-${randomUUID().slice(0, 6).toUpperCase()}`;
export const newVentureProposalId    = () => `VNT-PROP-${randomUUID().slice(0, 6).toUpperCase()}`;
export const newVentureInteractionId = () => `VNT-INT-${randomUUID().slice(0, 6).toUpperCase()}`;

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function listVentureCrmOpportunities(filters?: { stage?: string; prioridade?: string }): Promise<VentureCrmOpportunity[]> {
  if (!sql) {
    let rows = [...SEED_VENTURE_OPPORTUNITIES];
    if (filters?.stage)     rows = rows.filter(r => r.stage     === filters.stage);
    if (filters?.prioridade) rows = rows.filter(r => r.prioridade === filters.prioridade);
    return rows;
  }
  await initVentureCrmDB();
  const rows = await sql`
    SELECT id, empresa, setor, origem, deal_type, stage, probabilidade, prioridade,
           responsavel, fee_mensal, fee_mensal_quality, arr, arr_quality,
           contract_value, contract_value_quality, upside_pct, upside_type, upside_quality,
           valor_patrimonial_estimado, valor_patrimonial_quality,
           proxima_acao, deal_ref, notas_internas, last_updated
    FROM venture_crm_opportunities
    WHERE (${filters?.stage      ?? null}::text IS NULL OR stage      = ${filters?.stage      ?? null})
      AND (${filters?.prioridade ?? null}::text IS NULL OR prioridade = ${filters?.prioridade ?? null})
    ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as VentureCrmOpportunity[]) : SEED_VENTURE_OPPORTUNITIES;
}

export async function getVentureCrmOpportunity(id: string): Promise<VentureCrmOpportunity | null> {
  if (!sql) return SEED_VENTURE_OPPORTUNITIES.find(o => o.id === id) ?? null;
  await initVentureCrmDB();
  const rows = await sql`
    SELECT * FROM venture_crm_opportunities WHERE id = ${id}
  `;
  return rows[0] ? (rows[0] as unknown as VentureCrmOpportunity) : null;
}

export async function createVentureCrmOpportunity(data: Omit<VentureCrmOpportunity, "id">): Promise<VentureCrmOpportunity> {
  if (!sql) throw new Error("DB unavailable");
  await initVentureCrmDB();
  const id = newVentureOpportunityId();
  const today = new Date().toISOString().slice(0, 10);
  const [row] = await sql`
    INSERT INTO venture_crm_opportunities
      (id, empresa, setor, origem, deal_type, stage, probabilidade, prioridade,
       responsavel, fee_mensal, fee_mensal_quality, arr, arr_quality,
       contract_value, contract_value_quality, upside_pct, upside_type, upside_quality,
       valor_patrimonial_estimado, valor_patrimonial_quality,
       proxima_acao, deal_ref, notas_internas, last_updated)
    VALUES
      (${id}, ${data.empresa}, ${data.setor}, ${data.origem}, ${data.deal_type},
       ${data.stage}, ${data.probabilidade}, ${data.prioridade}, ${data.responsavel},
       ${data.fee_mensal ?? null}, ${data.fee_mensal_quality},
       ${data.arr ?? null}, ${data.arr_quality},
       ${data.contract_value ?? null}, ${data.contract_value_quality},
       ${data.upside_pct ?? null}, ${data.upside_type ?? null}, ${data.upside_quality},
       ${data.valor_patrimonial_estimado ?? null}, ${data.valor_patrimonial_quality},
       ${data.proxima_acao}, ${data.deal_ref ?? null}, ${data.notas_internas}, ${today})
    RETURNING *
  `;
  return row as unknown as VentureCrmOpportunity;
}

export async function updateVentureCrmOpportunity(
  id: string,
  updates: Partial<Omit<VentureCrmOpportunity, "id">>
): Promise<VentureCrmOpportunity | null> {
  if (!sql) return null;
  await initVentureCrmDB();
  const today = new Date().toISOString().slice(0, 10);
  const [row] = await sql`
    UPDATE venture_crm_opportunities SET
      stage                      = COALESCE(${updates.stage                      ?? null}, stage),
      probabilidade              = COALESCE(${updates.probabilidade              ?? null}, probabilidade),
      prioridade                 = COALESCE(${updates.prioridade                 ?? null}, prioridade),
      fee_mensal                 = COALESCE(${updates.fee_mensal                 ?? null}, fee_mensal),
      fee_mensal_quality         = COALESCE(${updates.fee_mensal_quality         ?? null}, fee_mensal_quality),
      arr                        = COALESCE(${updates.arr                        ?? null}, arr),
      arr_quality                = COALESCE(${updates.arr_quality                ?? null}, arr_quality),
      contract_value             = COALESCE(${updates.contract_value             ?? null}, contract_value),
      contract_value_quality     = COALESCE(${updates.contract_value_quality     ?? null}, contract_value_quality),
      upside_pct                 = COALESCE(${updates.upside_pct                 ?? null}, upside_pct),
      upside_type                = COALESCE(${updates.upside_type                ?? null}, upside_type),
      upside_quality             = COALESCE(${updates.upside_quality             ?? null}, upside_quality),
      proxima_acao               = COALESCE(${updates.proxima_acao               ?? null}, proxima_acao),
      notas_internas             = COALESCE(${updates.notas_internas             ?? null}, notas_internas),
      responsavel                = COALESCE(${updates.responsavel                ?? null}, responsavel),
      last_updated               = ${today}
    WHERE id = ${id}
    RETURNING *
  `;
  return row ? (row as unknown as VentureCrmOpportunity) : null;
}

export async function deleteVentureCrmOpportunity(id: string): Promise<boolean> {
  if (!sql) return false;
  await initVentureCrmDB();
  await sql`DELETE FROM venture_crm_opportunities WHERE id = ${id}`;
  return true;
}

// ─── Proposals ────────────────────────────────────────────────────────────────

export async function listVentureCrmProposals(opportunity_id?: string): Promise<VentureCrmProposal[]> {
  if (!sql) {
    const rows = opportunity_id
      ? SEED_VENTURE_PROPOSALS.filter(p => p.opportunity_id === opportunity_id)
      : [...SEED_VENTURE_PROPOSALS];
    return rows;
  }
  await initVentureCrmDB();
  const rows = await sql`
    SELECT id, opportunity_id, versao, status, titulo, resumo_executivo,
           fee_mensal, fee_quality, duracao_contrato, descricao_upside,
           client_visible, enviado_em, observacoes
    FROM venture_crm_proposals
    WHERE (${opportunity_id ?? null}::text IS NULL OR opportunity_id = ${opportunity_id ?? null})
    ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as VentureCrmProposal[]) : SEED_VENTURE_PROPOSALS;
}

export async function createVentureCrmProposal(data: Omit<VentureCrmProposal, "id">): Promise<VentureCrmProposal> {
  if (!sql) throw new Error("DB unavailable");
  await initVentureCrmDB();
  const id = newVentureProposalId();
  const [row] = await sql`
    INSERT INTO venture_crm_proposals
      (id, opportunity_id, versao, status, titulo, resumo_executivo,
       fee_mensal, fee_quality, duracao_contrato, descricao_upside,
       client_visible, enviado_em, observacoes)
    VALUES
      (${id}, ${data.opportunity_id}, ${data.versao}, ${data.status},
       ${data.titulo}, ${data.resumo_executivo}, ${data.fee_mensal ?? null},
       ${data.fee_quality}, ${data.duracao_contrato}, ${data.descricao_upside},
       ${data.client_visible}, ${data.enviado_em ?? null}, ${data.observacoes})
    RETURNING id, opportunity_id, versao, status, titulo, resumo_executivo,
              fee_mensal, fee_quality, duracao_contrato, descricao_upside,
              client_visible, enviado_em, observacoes
  `;
  return row as unknown as VentureCrmProposal;
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export async function listVentureCrmInteractions(opportunity_id?: string): Promise<VentureCrmInteraction[]> {
  if (!sql) {
    const rows = opportunity_id
      ? SEED_VENTURE_INTERACTIONS.filter(i => i.opportunity_id === opportunity_id)
      : [...SEED_VENTURE_INTERACTIONS];
    return rows;
  }
  await initVentureCrmDB();
  const rows = await sql`
    SELECT id, opportunity_id, tipo, resumo, proximo_passo, responsavel, data, observacoes
    FROM venture_crm_interactions
    WHERE (${opportunity_id ?? null}::text IS NULL OR opportunity_id = ${opportunity_id ?? null})
    ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as VentureCrmInteraction[]) : SEED_VENTURE_INTERACTIONS;
}

export async function createVentureCrmInteraction(data: Omit<VentureCrmInteraction, "id">): Promise<VentureCrmInteraction> {
  if (!sql) throw new Error("DB unavailable");
  await initVentureCrmDB();
  const id = newVentureInteractionId();
  const [row] = await sql`
    INSERT INTO venture_crm_interactions
      (id, opportunity_id, tipo, resumo, proximo_passo, responsavel, data, observacoes)
    VALUES
      (${id}, ${data.opportunity_id ?? null}, ${data.tipo}, ${data.resumo},
       ${data.proximo_passo}, ${data.responsavel}, ${data.data}, ${data.observacoes})
    RETURNING id, opportunity_id, tipo, resumo, proximo_passo, responsavel, data, observacoes
  `;
  return row as unknown as VentureCrmInteraction;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getVentureCrmStats() {
  const [opps, proposals] = await Promise.all([
    listVentureCrmOpportunities(),
    listVentureCrmProposals(),
  ]);

  const activeContracts = opps.filter(o =>
    o.stage === "Contrato Ativo" || o.stage === "Fee Recorrente"
  );
  const openPipeline = opps.filter(o =>
    o.stage !== "Encerrado" && o.stage !== "Fee Recorrente" && o.stage !== "Contrato Ativo"
  );

  const mrr = activeContracts.reduce((s, o) => s + (o.fee_mensal ?? 0), 0);
  const arr = activeContracts.reduce((s, o) => s + (o.arr ?? (o.fee_mensal ?? 0) * 12), 0);
  const proposalsSent = proposals.filter(p => p.status === "Enviado" || p.status === "Em Negociação");

  return {
    totalOpportunities:  opps.length,
    activeContracts:     activeContracts.length,
    openPipeline:        openPipeline.length,
    proposalsSent:       proposalsSent.length,
    mrr,
    arr,
    pipelinePotential:   openPipeline.reduce((s, o) => s + (o.arr ?? (o.fee_mensal ?? 0) * 12), 0),
  };
}
