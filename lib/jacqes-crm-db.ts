// ─── JACQES CRM — Internal Source of Truth ────────────────────────────────────
//
// FONTE CANÔNICA: Neon Postgres (Vercel). Seed data quando DB indisponível.
//
// Entidades:
//   jacqes_crm_leads          — leads de prospecção
//   jacqes_crm_opportunities  — oportunidades comerciais
//   jacqes_crm_proposals      — propostas vinculadas a oportunidades
//   jacqes_crm_clients        — carteira de clientes ativos
//   jacqes_crm_interactions   — histórico de interações (timeline)
//   jacqes_crm_tasks          — tarefas + SLA
//   jacqes_crm_visits         — visitas presenciais
//   jacqes_crm_expansion      — oportunidades de expansão
//   jacqes_crm_health_snapshot — snapshots periódicos de saúde de conta
//
// initCrmDB() é idempotente — seguro chamar em todo cold start.

import { sql } from "@/lib/db";

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
  canal: string | null;
  data: string;
  resumo: string;
  proximo_passo: string | null;
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
  observacoes: string | null;
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

// ─── Seed Data ────────────────────────────────────────────────────────────────
// Espelha os 4 clientes de lib/jacqes-customers.ts + pipeline de exemplo.
// Usado quando Neon DB não está disponível (GitHub Pages, dev local sem DB).

function dAgo(n: number) { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10); }
function dAhd(n: number) { return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10); }
const TODAY = new Date().toISOString().slice(0, 10);

export const SEED_CLIENTS: CrmClient[] = [
  {
    id: "cli-001", nome: "CEM", razao_social: "CEM Comunicação Ltda", cnpj: "",
    segmento: "Comunicação", produto_ativo: "FEE Mensal", ticket_mensal: 3200,
    inicio_relacao: "2025-01-01", owner: "Danilo", status_conta: "Ativo",
    health_score: 92, churn_risk: "Baixo", potencial_expansao: 8000,
    observacoes: "Cliente âncora. Alta satisfação. Expansão para tráfego pago em andamento.",
  },
  {
    id: "cli-002", nome: "CAROL BERTOLINI", razao_social: "Carol Bertolini ME", cnpj: "",
    segmento: "Influenciadora", produto_ativo: "FEE Mensal", ticket_mensal: 1790,
    inicio_relacao: "2025-03-01", owner: "Danilo", status_conta: "Em Atenção",
    health_score: 65, churn_risk: "Médio", potencial_expansao: 3000,
    observacoes: "Pagamento Abr/26 pendente. Acompanhar com prioridade.",
  },
  {
    id: "cli-003", nome: "ANDRÉ VIEIRA", razao_social: "André Vieira ME", cnpj: "",
    segmento: "Prestador de Serviços", produto_ativo: "FEE Mensal", ticket_mensal: 1500,
    inicio_relacao: "2025-02-01", owner: "Danilo", status_conta: "Em Atenção",
    health_score: 58, churn_risk: "Médio", potencial_expansao: 2000,
    observacoes: "Pagamento Abr/26 pendente. Revisão de contrato em curso.",
  },
  {
    id: "cli-004", nome: "TATI SIMÕES", razao_social: "Tati Simões Comunicação", cnpj: "",
    segmento: "Influenciadora", produto_ativo: "FEE Mensal", ticket_mensal: 1790,
    inicio_relacao: "2025-04-01", owner: "Danilo", status_conta: "Ativo",
    health_score: 88, churn_risk: "Baixo", potencial_expansao: 5000,
    observacoes: "Novo cliente Abr/26. Onboarding concluído. Interesse em conteúdo adicional.",
  },
];

export const SEED_LEADS: CrmLead[] = [
  {
    id: "lead-001", nome: "Marcos Oliveira", empresa: "Studio MKT",
    contato_principal: "Marcos Oliveira", telefone: "+55 11 98888-0001",
    email: "marcos@studiomkt.com.br", origem: "Indicação", segmento: "Marketing Digital",
    canal: "WhatsApp", interesse: "Gestão de redes + tráfego pago",
    status: "Qualificando", owner: "Danilo", data_entrada: dAgo(8),
    observacoes: "Indicado pela CEM. Orçamento estimado ~R$3.000/mês.",
  },
  {
    id: "lead-002", nome: "Fernanda Ribeiro", empresa: "Fernanda Ribeiro ME",
    contato_principal: "Fernanda Ribeiro", telefone: "+55 21 97777-0002",
    email: "fernanda@fernrib.com", origem: "Instagram", segmento: "Moda / Influência",
    canal: "DM Instagram", interesse: "FEE Mensal + Conteúdo",
    status: "Novo", owner: "Danilo", data_entrada: dAgo(2),
    observacoes: "Chegou pelo perfil da JACQES. Primeiro contato feito.",
  },
  {
    id: "lead-003", nome: "Roberto Nascimento", empresa: "Grupo Nasc",
    contato_principal: "Roberto Nascimento", telefone: "+55 31 96666-0003",
    email: "roberto@gruponasc.com", origem: "LinkedIn", segmento: "Varejo",
    canal: "LinkedIn", interesse: "Estratégia + Branding",
    status: "Nurturing", owner: "Danilo", data_entrada: dAgo(21),
    observacoes: "Bom potencial mas timing não ideal. Nutrir até Q3/26.",
  },
];

export const SEED_OPPORTUNITIES: CrmOpportunity[] = [
  {
    id: "opp-001", lead_id: "lead-001", cliente_id: null,
    nome_oportunidade: "Studio MKT — FEE Gestão Digital", empresa: "Studio MKT",
    segmento: "Marketing Digital", produto: "FEE Mensal", ticket_estimado: 3000,
    valor_potencial: 36000, stage: "Proposta", probabilidade: 70, owner: "Danilo",
    data_abertura: dAgo(8), proxima_acao: "Aguardar retorno da proposta enviada",
    data_proxima_acao: dAhd(3), risco: "Baixo", motivo_perda: "",
    data_fechamento_prevista: dAhd(14),
    observacoes: "Proposta de R$3.000/mês enviada em " + dAgo(3) + ".",
  },
  {
    id: "opp-002", lead_id: "lead-002", cliente_id: null,
    nome_oportunidade: "Fernanda Ribeiro — Pacote Conteúdo", empresa: "Fernanda Ribeiro ME",
    segmento: "Moda / Influência", produto: "Projeto + FEE", ticket_estimado: 2200,
    valor_potencial: 26400, stage: "Qualificação", probabilidade: 40, owner: "Danilo",
    data_abertura: dAgo(2), proxima_acao: "Agendar call de diagnóstico",
    data_proxima_acao: dAhd(2), risco: "Médio", motivo_perda: "",
    data_fechamento_prevista: dAhd(30),
    observacoes: "Primeiro contato realizado. Interesse confirmado. Próximo: diagnóstico.",
  },
  {
    id: "opp-003", lead_id: null, cliente_id: "cli-001",
    nome_oportunidade: "CEM — Expansão Tráfego Pago", empresa: "CEM",
    segmento: "Comunicação", produto: "Tráfego Pago", ticket_estimado: 4800,
    valor_potencial: 57600, stage: "Diagnóstico", probabilidade: 55, owner: "Danilo",
    data_abertura: dAgo(5), proxima_acao: "Apresentar auditoria de mídia paga",
    data_proxima_acao: dAhd(7), risco: "Baixo", motivo_perda: "",
    data_fechamento_prevista: dAhd(21),
    observacoes: "Cliente ativo pedindo expansão. Upsell confirmado, falta precificação final.",
  },
];

export const SEED_PROPOSALS: CrmProposal[] = [
  {
    id: "prop-001", opportunity_id: "opp-001", versao: 1, valor_proposto: 3000,
    escopo: "Gestão completa de redes sociais (3 canais) + tráfego pago Meta Ads",
    status: "Enviada", data_envio: dAgo(3), data_resposta: null,
    contraproposta: null, observacoes: "Aguardando feedback do cliente.",
  },
];

export const SEED_TASKS: CrmTask[] = [
  {
    id: "task-001", cliente_id: "cli-002", opportunity_id: null, lead_id: null,
    titulo: "Follow-up pagamento Carol Bertolini — Abr/26",
    categoria: "Follow-up Financeiro", prioridade: "Alta", status: "Aberta",
    responsavel: "Danilo", data_criacao: dAgo(1), prazo: dAhd(1),
    sla_horas: 24, data_conclusao: null, bloqueio: "", retrabalho: false,
  },
  {
    id: "task-002", cliente_id: "cli-003", opportunity_id: null, lead_id: null,
    titulo: "Retorno André Vieira — revisão de contrato",
    categoria: "Gestão de Conta", prioridade: "Alta", status: "Aberta",
    responsavel: "Danilo", data_criacao: dAgo(3), prazo: TODAY,
    sla_horas: 48, data_conclusao: null, bloqueio: "", retrabalho: false,
  },
  {
    id: "task-003", cliente_id: null, opportunity_id: "opp-002", lead_id: "lead-002",
    titulo: "Agendar call de diagnóstico com Fernanda Ribeiro",
    categoria: "Qualificação", prioridade: "Média", status: "Aberta",
    responsavel: "Danilo", data_criacao: dAgo(2), prazo: dAhd(2),
    sla_horas: 48, data_conclusao: null, bloqueio: "", retrabalho: false,
  },
  {
    id: "task-004", cliente_id: null, opportunity_id: "opp-001", lead_id: null,
    titulo: "Responder dúvidas da proposta — Studio MKT",
    categoria: "Proposta", prioridade: "Alta", status: "Aberta",
    responsavel: "Danilo", data_criacao: dAgo(3), prazo: dAhd(3),
    sla_horas: 24, data_conclusao: null, bloqueio: "", retrabalho: false,
  },
];

export const SEED_INTERACTIONS: CrmInteraction[] = [
  {
    id: "int-001", cliente_id: "cli-001", opportunity_id: null, lead_id: null,
    tipo: "Reunião", canal: "Presencial", data: dAgo(5),
    resumo: "Reunião de alinhamento Q2. CEM confirmou interesse em tráfego pago.",
    proximo_passo: "Apresentar auditoria de mídia paga até " + dAhd(7),
    responsavel: "Danilo", satisfacao_percebida: "Alta", risco_percebido: "Baixo",
  },
  {
    id: "int-002", cliente_id: "cli-002", opportunity_id: null, lead_id: null,
    tipo: "WhatsApp", canal: "WhatsApp", data: dAgo(2),
    resumo: "Lembrete de pagamento enviado. Cliente leu mas não respondeu.",
    proximo_passo: "Follow-up por ligação se não houver retorno até " + dAhd(1),
    responsavel: "Danilo", satisfacao_percebida: "Neutro", risco_percebido: "Médio",
  },
  {
    id: "int-003", cliente_id: null, opportunity_id: "opp-001", lead_id: "lead-001",
    tipo: "E-mail", canal: "E-mail", data: dAgo(3),
    resumo: "Proposta formal de R$3.000/mês enviada por e-mail.",
    proximo_passo: "Aguardar retorno em até 5 dias úteis.",
    responsavel: "Danilo", satisfacao_percebida: "Neutro", risco_percebido: "Baixo",
  },
  {
    id: "int-004", cliente_id: "cli-004", opportunity_id: null, lead_id: null,
    tipo: "Ligação", canal: "Telefone", data: dAgo(7),
    resumo: "Call de onboarding Tati Simões. Apresentação da metodologia e calendário editorial.",
    proximo_passo: "Enviar primeiro relatório de desempenho em " + dAhd(7),
    responsavel: "Danilo", satisfacao_percebida: "Alta", risco_percebido: "Baixo",
  },
];

export const SEED_EXPANSION: CrmExpansion[] = [
  {
    id: "exp-001", cliente_id: "cli-001", tipo: "Upsell", valor_potencial: 4800,
    status: "Em Diagnóstico", owner: "Danilo",
    proxima_acao: "Apresentar auditoria de mídia paga",
    observacoes: "CEM — entrada em tráfego pago. MRR potencial: R$4.800/mês.",
  },
  {
    id: "exp-002", cliente_id: "cli-004", tipo: "Cross-sell", valor_potencial: 2500,
    status: "Identificada", owner: "Danilo",
    proxima_acao: "Agendar conversa sobre produção de conteúdo",
    observacoes: "Tati — interesse em criação de conteúdo além do FEE.",
  },
];

export const SEED_HEALTH: CrmHealthSnapshot[] = [
  {
    id: "health-001", cliente_id: "cli-001", periodo: "Abr/26", health_score: 92,
    churn_risk: "Baixo", ultima_interacao: dAgo(5), followups_em_dia: true,
    pendencias: 0, expansao_aberta: true,
  },
  {
    id: "health-002", cliente_id: "cli-002", periodo: "Abr/26", health_score: 65,
    churn_risk: "Médio", ultima_interacao: dAgo(2), followups_em_dia: false,
    pendencias: 1, expansao_aberta: false,
  },
  {
    id: "health-003", cliente_id: "cli-003", periodo: "Abr/26", health_score: 58,
    churn_risk: "Médio", ultima_interacao: dAgo(10), followups_em_dia: false,
    pendencias: 2, expansao_aberta: false,
  },
  {
    id: "health-004", cliente_id: "cli-004", periodo: "Abr/26", health_score: 88,
    churn_risk: "Baixo", ultima_interacao: dAgo(7), followups_em_dia: true,
    pendencias: 0, expansao_aberta: true,
  },
];

// ─── DB Init (idempotente) ────────────────────────────────────────────────────

export async function initCrmDB(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS jacqes_crm_leads (
      id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      nome              TEXT NOT NULL,
      empresa           TEXT DEFAULT '',
      contato_principal TEXT DEFAULT '',
      telefone          TEXT DEFAULT '',
      email             TEXT DEFAULT '',
      origem            TEXT DEFAULT 'Indicação',
      segmento          TEXT DEFAULT '',
      canal             TEXT DEFAULT '',
      interesse         TEXT DEFAULT '',
      status            TEXT DEFAULT 'Novo',
      owner             TEXT DEFAULT '',
      data_entrada      DATE DEFAULT CURRENT_DATE,
      observacoes       TEXT DEFAULT '',
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS jacqes_crm_opportunities (
      id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      lead_id                  TEXT,
      cliente_id               TEXT,
      nome_oportunidade        TEXT NOT NULL,
      empresa                  TEXT DEFAULT '',
      segmento                 TEXT DEFAULT '',
      produto                  TEXT DEFAULT '',
      ticket_estimado          NUMERIC DEFAULT 0,
      valor_potencial          NUMERIC DEFAULT 0,
      stage                    TEXT DEFAULT 'Novo Lead',
      probabilidade            INTEGER DEFAULT 20,
      owner                    TEXT DEFAULT '',
      data_abertura            DATE DEFAULT CURRENT_DATE,
      proxima_acao             TEXT DEFAULT '',
      data_proxima_acao        DATE,
      risco                    TEXT DEFAULT 'Baixo',
      motivo_perda             TEXT DEFAULT '',
      data_fechamento_prevista DATE,
      observacoes              TEXT DEFAULT '',
      created_at               TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS jacqes_crm_proposals (
      id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      opportunity_id TEXT,
      versao         INTEGER DEFAULT 1,
      valor_proposto NUMERIC DEFAULT 0,
      escopo         TEXT DEFAULT '',
      status         TEXT DEFAULT 'Rascunho',
      data_envio     DATE,
      data_resposta  DATE,
      contraproposta NUMERIC,
      observacoes    TEXT DEFAULT '',
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS jacqes_crm_clients (
      id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      nome               TEXT NOT NULL,
      razao_social       TEXT DEFAULT '',
      cnpj               TEXT DEFAULT '',
      segmento           TEXT DEFAULT '',
      produto_ativo      TEXT DEFAULT '',
      ticket_mensal      NUMERIC DEFAULT 0,
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
    CREATE TABLE IF NOT EXISTS jacqes_crm_interactions (
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
    CREATE TABLE IF NOT EXISTS jacqes_crm_tasks (
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
      retrabalho     BOOLEAN DEFAULT FALSE,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS jacqes_crm_visits (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      cliente_id    TEXT,
      data          DATE DEFAULT CURRENT_DATE,
      objetivo      TEXT DEFAULT '',
      resultado     TEXT DEFAULT '',
      proximo_passo TEXT DEFAULT '',
      responsavel   TEXT DEFAULT '',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS jacqes_crm_expansion (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      cliente_id      TEXT,
      tipo            TEXT DEFAULT 'Upsell',
      valor_potencial NUMERIC DEFAULT 0,
      status          TEXT DEFAULT 'Identificada',
      owner           TEXT DEFAULT '',
      proxima_acao    TEXT DEFAULT '',
      observacoes     TEXT DEFAULT '',
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS jacqes_crm_health_snapshot (
      id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      cliente_id        TEXT,
      periodo           TEXT DEFAULT '',
      health_score      INTEGER DEFAULT 80,
      churn_risk        TEXT DEFAULT 'Baixo',
      ultima_interacao  DATE,
      followups_em_dia  BOOLEAN DEFAULT TRUE,
      pendencias        INTEGER DEFAULT 0,
      expansao_aberta   BOOLEAN DEFAULT FALSE,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// ─── CRUD — Leads ─────────────────────────────────────────────────────────────

export async function listLeads(): Promise<CrmLead[]> {
  if (!sql) return SEED_LEADS;
  await initCrmDB();
  const rows = await sql`
    SELECT id, nome, empresa, contato_principal, telefone, email, origem,
           segmento, canal, interesse, status, owner,
           data_entrada::text AS data_entrada, observacoes
    FROM jacqes_crm_leads ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as CrmLead[]) : SEED_LEADS;
}

export async function createLead(data: Omit<CrmLead, "id">): Promise<CrmLead> {
  if (!sql) throw new Error("DB unavailable");
  await initCrmDB();
  const [row] = await sql`
    INSERT INTO jacqes_crm_leads
      (nome, empresa, contato_principal, telefone, email, origem, segmento,
       canal, interesse, status, owner, data_entrada, observacoes)
    VALUES
      (${data.nome}, ${data.empresa}, ${data.contato_principal}, ${data.telefone},
       ${data.email}, ${data.origem}, ${data.segmento}, ${data.canal},
       ${data.interesse}, ${data.status}, ${data.owner}, ${data.data_entrada},
       ${data.observacoes})
    RETURNING id, nome, empresa, contato_principal, telefone, email, origem,
              segmento, canal, interesse, status, owner,
              data_entrada::text AS data_entrada, observacoes
  `;
  return row as unknown as CrmLead;
}

// ─── CRUD — Opportunities ─────────────────────────────────────────────────────

export async function listOpportunities(): Promise<CrmOpportunity[]> {
  if (!sql) return SEED_OPPORTUNITIES;
  await initCrmDB();
  const rows = await sql`
    SELECT id, lead_id, cliente_id, nome_oportunidade, empresa, segmento, produto,
           ticket_estimado::float AS ticket_estimado,
           valor_potencial::float AS valor_potencial,
           stage, probabilidade, owner,
           data_abertura::text AS data_abertura, proxima_acao,
           data_proxima_acao::text AS data_proxima_acao, risco, motivo_perda,
           data_fechamento_prevista::text AS data_fechamento_prevista, observacoes
    FROM jacqes_crm_opportunities ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as CrmOpportunity[]) : SEED_OPPORTUNITIES;
}

export async function createOpportunity(data: Omit<CrmOpportunity, "id">): Promise<CrmOpportunity> {
  if (!sql) throw new Error("DB unavailable");
  await initCrmDB();
  const [row] = await sql`
    INSERT INTO jacqes_crm_opportunities
      (lead_id, cliente_id, nome_oportunidade, empresa, segmento, produto,
       ticket_estimado, valor_potencial, stage, probabilidade, owner,
       data_abertura, proxima_acao, data_proxima_acao, risco, motivo_perda,
       data_fechamento_prevista, observacoes)
    VALUES
      (${data.lead_id}, ${data.cliente_id}, ${data.nome_oportunidade}, ${data.empresa},
       ${data.segmento}, ${data.produto}, ${data.ticket_estimado}, ${data.valor_potencial},
       ${data.stage}, ${data.probabilidade}, ${data.owner}, ${data.data_abertura},
       ${data.proxima_acao}, ${data.data_proxima_acao}, ${data.risco}, ${data.motivo_perda},
       ${data.data_fechamento_prevista}, ${data.observacoes})
    RETURNING *
  `;
  return row as unknown as CrmOpportunity;
}

// ─── CRUD — Clients ───────────────────────────────────────────────────────────

export async function listCrmClients(): Promise<CrmClient[]> {
  if (!sql) return SEED_CLIENTS;
  await initCrmDB();
  const rows = await sql`
    SELECT id, nome, razao_social, cnpj, segmento, produto_ativo,
           ticket_mensal::float AS ticket_mensal,
           inicio_relacao::text AS inicio_relacao, owner, status_conta,
           health_score, churn_risk,
           potencial_expansao::float AS potencial_expansao, observacoes
    FROM jacqes_crm_clients ORDER BY nome
  `;
  return rows.length ? (rows as unknown as CrmClient[]) : SEED_CLIENTS;
}

export async function createCrmClient(data: Omit<CrmClient, "id">): Promise<CrmClient> {
  if (!sql) throw new Error("DB unavailable");
  await initCrmDB();
  const [row] = await sql`
    INSERT INTO jacqes_crm_clients
      (nome, razao_social, cnpj, segmento, produto_ativo, ticket_mensal,
       inicio_relacao, owner, status_conta, health_score, churn_risk,
       potencial_expansao, observacoes)
    VALUES
      (${data.nome}, ${data.razao_social}, ${data.cnpj}, ${data.segmento},
       ${data.produto_ativo}, ${data.ticket_mensal}, ${data.inicio_relacao},
       ${data.owner}, ${data.status_conta}, ${data.health_score}, ${data.churn_risk},
       ${data.potencial_expansao}, ${data.observacoes})
    RETURNING *
  `;
  return row as unknown as CrmClient;
}

// ─── CRUD — Interactions ──────────────────────────────────────────────────────

export async function listInteractions(): Promise<CrmInteraction[]> {
  if (!sql) return SEED_INTERACTIONS;
  await initCrmDB();
  const rows = await sql`
    SELECT id, cliente_id, opportunity_id, lead_id, tipo, canal,
           data::text AS data, resumo, proximo_passo, responsavel,
           satisfacao_percebida, risco_percebido
    FROM jacqes_crm_interactions ORDER BY data DESC, created_at DESC
  `;
  return rows.length ? (rows as unknown as CrmInteraction[]) : SEED_INTERACTIONS;
}

export async function createInteraction(data: Omit<CrmInteraction, "id">): Promise<CrmInteraction> {
  if (!sql) throw new Error("DB unavailable");
  await initCrmDB();
  const [row] = await sql`
    INSERT INTO jacqes_crm_interactions
      (cliente_id, opportunity_id, lead_id, tipo, canal, data, resumo,
       proximo_passo, responsavel, satisfacao_percebida, risco_percebido)
    VALUES
      (${data.cliente_id}, ${data.opportunity_id}, ${data.lead_id}, ${data.tipo},
       ${data.canal}, ${data.data}, ${data.resumo}, ${data.proximo_passo},
       ${data.responsavel}, ${data.satisfacao_percebida}, ${data.risco_percebido})
    RETURNING *
  `;
  return row as unknown as CrmInteraction;
}

// ─── CRUD — Tasks ─────────────────────────────────────────────────────────────

export async function listTasks(): Promise<CrmTask[]> {
  if (!sql) return SEED_TASKS;
  await initCrmDB();
  const rows = await sql`
    SELECT id, cliente_id, opportunity_id, lead_id, titulo, categoria,
           prioridade, status, responsavel,
           data_criacao::text AS data_criacao,
           prazo::text AS prazo, sla_horas,
           data_conclusao::text AS data_conclusao, bloqueio, retrabalho
    FROM jacqes_crm_tasks ORDER BY prazo ASC NULLS LAST, created_at DESC
  `;
  return rows.length ? (rows as unknown as CrmTask[]) : SEED_TASKS;
}

export async function createTask(data: Omit<CrmTask, "id">): Promise<CrmTask> {
  if (!sql) throw new Error("DB unavailable");
  await initCrmDB();
  const [row] = await sql`
    INSERT INTO jacqes_crm_tasks
      (cliente_id, opportunity_id, lead_id, titulo, categoria, prioridade,
       status, responsavel, data_criacao, prazo, sla_horas, data_conclusao,
       bloqueio, retrabalho)
    VALUES
      (${data.cliente_id}, ${data.opportunity_id}, ${data.lead_id}, ${data.titulo},
       ${data.categoria}, ${data.prioridade}, ${data.status}, ${data.responsavel},
       ${data.data_criacao}, ${data.prazo}, ${data.sla_horas}, ${data.data_conclusao},
       ${data.bloqueio}, ${data.retrabalho})
    RETURNING *
  `;
  return row as unknown as CrmTask;
}

// ─── CRUD — Expansion ─────────────────────────────────────────────────────────

export async function listExpansion(): Promise<CrmExpansion[]> {
  if (!sql) return SEED_EXPANSION;
  await initCrmDB();
  const rows = await sql`
    SELECT id, cliente_id, tipo, valor_potencial::float AS valor_potencial,
           status, owner, proxima_acao, observacoes
    FROM jacqes_crm_expansion ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as CrmExpansion[]) : SEED_EXPANSION;
}

// ─── CRUD — Health ────────────────────────────────────────────────────────────

export async function listHealth(): Promise<CrmHealthSnapshot[]> {
  if (!sql) return SEED_HEALTH;
  await initCrmDB();
  const rows = await sql`
    SELECT id, cliente_id, periodo, health_score, churn_risk,
           ultima_interacao::text AS ultima_interacao,
           followups_em_dia, pendencias, expansao_aberta
    FROM jacqes_crm_health_snapshot ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as CrmHealthSnapshot[]) : SEED_HEALTH;
}

// ─── Proposals ────────────────────────────────────────────────────────────────

export async function listProposals(): Promise<CrmProposal[]> {
  if (!sql) return SEED_PROPOSALS;
  await initCrmDB();
  const rows = await sql`
    SELECT id, opportunity_id, versao, valor_proposto::float AS valor_proposto,
           escopo, status,
           data_envio::text AS data_envio,
           data_resposta::text AS data_resposta,
           contraproposta::float AS contraproposta, observacoes
    FROM jacqes_crm_proposals ORDER BY created_at DESC
  `;
  return rows.length ? (rows as unknown as CrmProposal[]) : SEED_PROPOSALS;
}
