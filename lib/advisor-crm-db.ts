// ─── Advisor — CRM Database Layer ─────────────────────────────────────────────
//
// SOURCE OF TRUTH: Neon Postgres (Vercel).
// GitHub Pages: static JSON snapshots (read-only).
//
// Tables — ISOLATED from JACQES + Caza CRM:
//   advisor_crm_leads         — prospecção de novos clientes de consultoria
//   advisor_crm_opportunities — oportunidades de projetos / retainers
//   advisor_crm_proposals     — propostas vinculadas a oportunidades
//   advisor_crm_clients       — carteira de clientes de consultoria
//   advisor_crm_interactions  — histórico de interações
//   advisor_crm_tasks         — tarefas + follow-ups
//
// Zero imports de outros CRMs — separação total de BU.

import { sql } from "@/lib/db";

// ─── Enumerações ──────────────────────────────────────────────────────────────

export const ADVISOR_PIPELINE_STAGES = [
  "Prospecção",
  "Diagnóstico",
  "Proposta",
  "Negociação",
  "Fechado Ganho",
  "Fechado Perdido",
] as const;

export const ADVISOR_SERVICE_TYPES = [
  "Consultoria Estratégica",
  "Consultoria de Marketing",
  "Implantação CRM",
  "Gestão de Projetos",
  "Treinamento & Capacitação",
  "Assessment / Diagnóstico",
  "Outro",
] as const;

export const ADVISOR_LEAD_ORIGENS = [
  "Indicação",
  "LinkedIn",
  "Evento",
  "Site",
  "WhatsApp",
  "Parceiro",
  "Outbound",
  "Outro",
] as const;

export const ADVISOR_LEAD_STATUSES = [
  "Novo",
  "Qualificando",
  "Convertido",
  "Perdido",
  "Nurturing",
] as const;

export const ADVISOR_PROPOSAL_STATUSES = [
  "Em Elaboração",
  "Enviada",
  "Aprovada",
  "Rejeitada",
  "Em Revisão",
] as const;

export const ADVISOR_INTERACTION_TYPES = [
  "Ligação",
  "Reunião",
  "Workshop",
  "WhatsApp",
  "E-mail",
  "Follow-up",
  "Proposta Enviada",
  "Apresentação",
  "Observação",
] as const;

export const ADVISOR_RISK_LEVELS = ["Baixo", "Médio", "Alto"] as const;

export const ADVISOR_CLIENT_STATUSES = [
  "Ativo",
  "Em Atenção",
  "Em Risco",
  "Churned",
  "Inativo",
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdvisorCrmLead = {
  id: string;
  nome: string;
  cargo: string;
  empresa: string;
  cnpj: string;
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

export type AdvisorCrmOpportunity = {
  id: string;
  lead_id: string | null;
  cliente_id: string | null;
  nome_oportunidade: string;
  empresa: string;
  tipo_servico: string;
  valor_estimado: number;
  recorrencia_mensal: number | null; // Para contratos de retainer
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

export type AdvisorCrmProposal = {
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

export type AdvisorCrmClient = {
  id: string;
  nome: string;
  razao_social: string;
  cnpj: string;
  segmento: string;
  servico_ativo: string;
  fee_mensal: number;
  inicio_relacao: string | null;
  owner: string;
  status_conta: string;
  health_score: number;
  churn_risk: string;
  potencial_expansao: number;
  observacoes: string;
};

export type AdvisorCrmInteraction = {
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

export type AdvisorCrmTask = {
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
};

// ─── Seed Data (vazio — preenchido com dados reais) ───────────────────────────

export const SEED_LEADS: AdvisorCrmLead[]         = [];
export const SEED_OPPORTUNITIES: AdvisorCrmOpportunity[] = [];
export const SEED_PROPOSALS: AdvisorCrmProposal[] = [];
export const SEED_CLIENTS: AdvisorCrmClient[]     = [];
export const SEED_INTERACTIONS: AdvisorCrmInteraction[] = [];
export const SEED_TASKS: AdvisorCrmTask[]         = [];

// ─── DB Init (idempotente) ────────────────────────────────────────────────────

export async function initAdvisorCrmDB(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS advisor_crm_leads (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      nome        TEXT NOT NULL,
      cargo       TEXT DEFAULT '',
      empresa     TEXT DEFAULT '',
      cnpj        TEXT DEFAULT '',
      telefone    TEXT DEFAULT '',
      email       TEXT DEFAULT '',
      origem      TEXT DEFAULT 'Indicação',
      tipo_servico TEXT DEFAULT '',
      interesse   TEXT DEFAULT '',
      status      TEXT DEFAULT 'Novo',
      owner       TEXT DEFAULT '',
      data_entrada DATE DEFAULT CURRENT_DATE,
      observacoes TEXT DEFAULT '',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS advisor_crm_opportunities (
      id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      lead_id             TEXT,
      cliente_id          TEXT,
      nome_oportunidade   TEXT NOT NULL,
      empresa             TEXT DEFAULT '',
      tipo_servico        TEXT DEFAULT '',
      valor_estimado      NUMERIC DEFAULT 0,
      recorrencia_mensal  NUMERIC,
      stage               TEXT DEFAULT 'Prospecção',
      probabilidade       INTEGER DEFAULT 20,
      owner               TEXT DEFAULT '',
      data_abertura       DATE DEFAULT CURRENT_DATE,
      prazo_estimado      DATE,
      proxima_acao        TEXT DEFAULT '',
      data_proxima_acao   DATE,
      risco               TEXT DEFAULT 'Baixo',
      motivo_perda        TEXT DEFAULT '',
      observacoes         TEXT DEFAULT '',
      created_at          TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS advisor_crm_proposals (
      id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      opportunity_id TEXT,
      versao         INTEGER DEFAULT 1,
      valor_proposto NUMERIC DEFAULT 0,
      escopo         TEXT DEFAULT '',
      status         TEXT DEFAULT 'Em Elaboração',
      data_envio     DATE,
      data_resposta  DATE,
      contraproposta NUMERIC,
      observacoes    TEXT DEFAULT '',
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS advisor_crm_clients (
      id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      nome               TEXT NOT NULL,
      razao_social       TEXT DEFAULT '',
      cnpj               TEXT DEFAULT '',
      segmento           TEXT DEFAULT '',
      servico_ativo      TEXT DEFAULT '',
      fee_mensal         NUMERIC DEFAULT 0,
      inicio_relacao     DATE,
      owner              TEXT DEFAULT '',
      status_conta       TEXT DEFAULT 'Ativo',
      health_score       INTEGER DEFAULT 80,
      churn_risk         TEXT DEFAULT 'Baixo',
      potencial_expansao NUMERIC DEFAULT 0,
      observacoes        TEXT DEFAULT '',
      created_at         TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS advisor_crm_interactions (
      id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      cliente_id           TEXT,
      opportunity_id       TEXT,
      lead_id              TEXT,
      tipo                 TEXT DEFAULT 'Ligação',
      canal                TEXT DEFAULT '',
      data                 DATE DEFAULT CURRENT_DATE,
      resumo               TEXT DEFAULT '',
      proximo_passo        TEXT DEFAULT '',
      responsavel          TEXT DEFAULT '',
      satisfacao_percebida TEXT DEFAULT 'Neutro',
      risco_percebido      TEXT DEFAULT 'Baixo',
      created_at           TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS advisor_crm_tasks (
      id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      cliente_id     TEXT,
      opportunity_id TEXT,
      lead_id        TEXT,
      titulo         TEXT NOT NULL,
      categoria      TEXT DEFAULT 'Follow-up',
      prioridade     TEXT DEFAULT 'Média',
      status         TEXT DEFAULT 'Aberta',
      responsavel    TEXT DEFAULT '',
      data_criacao   DATE DEFAULT CURRENT_DATE,
      prazo          DATE,
      sla_horas      INTEGER DEFAULT 24,
      data_conclusao DATE,
      bloqueio       TEXT DEFAULT '',
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// ─── CRUD — Leads ─────────────────────────────────────────────────────────────

export async function listLeads(): Promise<AdvisorCrmLead[]> {
  if (!sql) return SEED_LEADS;
  await initAdvisorCrmDB();
  const rows = await sql`
    SELECT id, nome, cargo, empresa, cnpj, telefone, email, origem,
           tipo_servico, interesse, status, owner,
           data_entrada::text AS data_entrada, observacoes
    FROM advisor_crm_leads ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as AdvisorCrmLead[]) : SEED_LEADS;
}

export async function createLead(data: Omit<AdvisorCrmLead, "id">): Promise<AdvisorCrmLead> {
  if (!sql) throw new Error("DB unavailable");
  await initAdvisorCrmDB();
  const [row] = await sql`
    INSERT INTO advisor_crm_leads
      (nome, cargo, empresa, cnpj, telefone, email, origem,
       tipo_servico, interesse, status, owner, data_entrada, observacoes)
    VALUES
      (${data.nome}, ${data.cargo}, ${data.empresa}, ${data.cnpj},
       ${data.telefone}, ${data.email}, ${data.origem}, ${data.tipo_servico},
       ${data.interesse}, ${data.status}, ${data.owner}, ${data.data_entrada},
       ${data.observacoes})
    RETURNING id, nome, cargo, empresa, cnpj, telefone, email, origem,
              tipo_servico, interesse, status, owner,
              data_entrada::text AS data_entrada, observacoes
  `;
  return row as unknown as AdvisorCrmLead;
}

// ─── CRUD — Opportunities ─────────────────────────────────────────────────────

export async function listOpportunities(): Promise<AdvisorCrmOpportunity[]> {
  if (!sql) return SEED_OPPORTUNITIES;
  await initAdvisorCrmDB();
  const rows = await sql`
    SELECT id, lead_id, cliente_id, nome_oportunidade, empresa, tipo_servico,
           valor_estimado::float AS valor_estimado,
           recorrencia_mensal::float AS recorrencia_mensal,
           stage, probabilidade, owner,
           data_abertura::text AS data_abertura,
           prazo_estimado::text AS prazo_estimado,
           proxima_acao,
           data_proxima_acao::text AS data_proxima_acao,
           risco, motivo_perda, observacoes
    FROM advisor_crm_opportunities ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as AdvisorCrmOpportunity[]) : SEED_OPPORTUNITIES;
}

export async function createOpportunity(data: Omit<AdvisorCrmOpportunity, "id">): Promise<AdvisorCrmOpportunity> {
  if (!sql) throw new Error("DB unavailable");
  await initAdvisorCrmDB();
  const [row] = await sql`
    INSERT INTO advisor_crm_opportunities
      (lead_id, cliente_id, nome_oportunidade, empresa, tipo_servico,
       valor_estimado, recorrencia_mensal, stage, probabilidade, owner,
       data_abertura, prazo_estimado, proxima_acao, data_proxima_acao,
       risco, motivo_perda, observacoes)
    VALUES
      (${data.lead_id}, ${data.cliente_id}, ${data.nome_oportunidade}, ${data.empresa},
       ${data.tipo_servico}, ${data.valor_estimado}, ${data.recorrencia_mensal},
       ${data.stage}, ${data.probabilidade}, ${data.owner}, ${data.data_abertura},
       ${data.prazo_estimado}, ${data.proxima_acao}, ${data.data_proxima_acao},
       ${data.risco}, ${data.motivo_perda}, ${data.observacoes})
    RETURNING *
  `;
  return row as unknown as AdvisorCrmOpportunity;
}

export async function updateOpportunityStage(id: string, stage: string, probabilidade: number): Promise<void> {
  if (!sql) throw new Error("DB unavailable");
  await sql`
    UPDATE advisor_crm_opportunities
    SET stage = ${stage}, probabilidade = ${probabilidade}
    WHERE id = ${id}
  `;
}

// ─── CRUD — Proposals ─────────────────────────────────────────────────────────

export async function listProposals(): Promise<AdvisorCrmProposal[]> {
  if (!sql) return SEED_PROPOSALS;
  await initAdvisorCrmDB();
  const rows = await sql`
    SELECT id, opportunity_id, versao,
           valor_proposto::float AS valor_proposto,
           escopo, status,
           data_envio::text AS data_envio,
           data_resposta::text AS data_resposta,
           contraproposta::float AS contraproposta, observacoes
    FROM advisor_crm_proposals ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as AdvisorCrmProposal[]) : SEED_PROPOSALS;
}

// ─── CRUD — Clients ───────────────────────────────────────────────────────────

export async function listCrmClients(): Promise<AdvisorCrmClient[]> {
  if (!sql) return SEED_CLIENTS;
  await initAdvisorCrmDB();
  const rows = await sql`
    SELECT id, nome, razao_social, cnpj, segmento, servico_ativo,
           fee_mensal::float AS fee_mensal,
           inicio_relacao::text AS inicio_relacao,
           owner, status_conta, health_score, churn_risk,
           potencial_expansao::float AS potencial_expansao, observacoes
    FROM advisor_crm_clients ORDER BY nome
  `;
  return rows.length ? (rows as unknown as AdvisorCrmClient[]) : SEED_CLIENTS;
}

export async function createCrmClient(data: Omit<AdvisorCrmClient, "id">): Promise<AdvisorCrmClient> {
  if (!sql) throw new Error("DB unavailable");
  await initAdvisorCrmDB();
  const [row] = await sql`
    INSERT INTO advisor_crm_clients
      (nome, razao_social, cnpj, segmento, servico_ativo, fee_mensal,
       inicio_relacao, owner, status_conta, health_score, churn_risk,
       potencial_expansao, observacoes)
    VALUES
      (${data.nome}, ${data.razao_social}, ${data.cnpj}, ${data.segmento},
       ${data.servico_ativo}, ${data.fee_mensal}, ${data.inicio_relacao},
       ${data.owner}, ${data.status_conta}, ${data.health_score}, ${data.churn_risk},
       ${data.potencial_expansao}, ${data.observacoes})
    RETURNING *
  `;
  return row as unknown as AdvisorCrmClient;
}

// ─── CRUD — Interactions ──────────────────────────────────────────────────────

export async function listInteractions(): Promise<AdvisorCrmInteraction[]> {
  if (!sql) return SEED_INTERACTIONS;
  await initAdvisorCrmDB();
  const rows = await sql`
    SELECT id, cliente_id, opportunity_id, lead_id, tipo, canal,
           data::text AS data, resumo, proximo_passo, responsavel,
           satisfacao_percebida, risco_percebido
    FROM advisor_crm_interactions ORDER BY data DESC, created_at DESC
  `;
  return rows.length ? (rows as unknown as AdvisorCrmInteraction[]) : SEED_INTERACTIONS;
}

export async function createInteraction(data: Omit<AdvisorCrmInteraction, "id">): Promise<AdvisorCrmInteraction> {
  if (!sql) throw new Error("DB unavailable");
  await initAdvisorCrmDB();
  const [row] = await sql`
    INSERT INTO advisor_crm_interactions
      (cliente_id, opportunity_id, lead_id, tipo, canal, data, resumo,
       proximo_passo, responsavel, satisfacao_percebida, risco_percebido)
    VALUES
      (${data.cliente_id}, ${data.opportunity_id}, ${data.lead_id}, ${data.tipo},
       ${data.canal}, ${data.data}, ${data.resumo}, ${data.proximo_passo},
       ${data.responsavel}, ${data.satisfacao_percebida}, ${data.risco_percebido})
    RETURNING *
  `;
  return row as unknown as AdvisorCrmInteraction;
}

// ─── CRUD — Tasks ─────────────────────────────────────────────────────────────

export async function listTasks(): Promise<AdvisorCrmTask[]> {
  if (!sql) return SEED_TASKS;
  await initAdvisorCrmDB();
  const rows = await sql`
    SELECT id, cliente_id, opportunity_id, lead_id, titulo, categoria,
           prioridade, status, responsavel,
           data_criacao::text AS data_criacao,
           prazo::text AS prazo, sla_horas,
           data_conclusao::text AS data_conclusao, bloqueio
    FROM advisor_crm_tasks ORDER BY prazo ASC NULLS LAST, created_at DESC
  `;
  return rows.length ? (rows as unknown as AdvisorCrmTask[]) : SEED_TASKS;
}

export async function createTask(data: Omit<AdvisorCrmTask, "id">): Promise<AdvisorCrmTask> {
  if (!sql) throw new Error("DB unavailable");
  await initAdvisorCrmDB();
  const [row] = await sql`
    INSERT INTO advisor_crm_tasks
      (cliente_id, opportunity_id, lead_id, titulo, categoria, prioridade,
       status, responsavel, data_criacao, prazo, sla_horas, data_conclusao, bloqueio)
    VALUES
      (${data.cliente_id}, ${data.opportunity_id}, ${data.lead_id}, ${data.titulo},
       ${data.categoria}, ${data.prioridade}, ${data.status}, ${data.responsavel},
       ${data.data_criacao}, ${data.prazo}, ${data.sla_horas}, ${data.data_conclusao},
       ${data.bloqueio})
    RETURNING *
  `;
  return row as unknown as AdvisorCrmTask;
}

export async function updateTask(id: string, patch: Partial<Omit<AdvisorCrmTask, "id">>): Promise<AdvisorCrmTask | null> {
  if (!sql) throw new Error("DB unavailable");
  await initAdvisorCrmDB();
  const rows = await sql`
    UPDATE advisor_crm_tasks SET
      titulo         = COALESCE(${patch.titulo         ?? null}, titulo),
      categoria      = COALESCE(${patch.categoria      ?? null}, categoria),
      prioridade     = COALESCE(${patch.prioridade     ?? null}, prioridade),
      status         = COALESCE(${patch.status         ?? null}, status),
      responsavel    = COALESCE(${patch.responsavel    ?? null}, responsavel),
      sla_horas      = COALESCE(${patch.sla_horas      ?? null}, sla_horas),
      bloqueio       = COALESCE(${patch.bloqueio       ?? null}, bloqueio),
      cliente_id     = COALESCE(${patch.cliente_id     ?? null}, cliente_id),
      opportunity_id = COALESCE(${patch.opportunity_id ?? null}, opportunity_id),
      lead_id        = COALESCE(${patch.lead_id        ?? null}, lead_id),
      prazo          = COALESCE(${patch.prazo          ?? null}::date, prazo),
      data_conclusao = COALESCE(${patch.data_conclusao ?? null}::date, data_conclusao)
    WHERE id = ${id}
    RETURNING id, cliente_id, opportunity_id, lead_id, titulo, categoria,
              prioridade, status, responsavel,
              data_criacao::text AS data_criacao,
              prazo::text        AS prazo, sla_horas,
              data_conclusao::text AS data_conclusao, bloqueio
  `;
  return rows.length ? (rows[0] as unknown as AdvisorCrmTask) : null;
}
