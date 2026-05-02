// GET /api/awq/crm/consolidated — métricas CRM consolidadas de todas as BUs
// ACESSO: apenas role "ceo" ou "holding" (apiGuard layer: holding)
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

async function queryCount(table: string, where = ""): Promise<number> {
  if (!sql) return 0;
  try {
    const rows = await sql.unsafe(
      `SELECT COUNT(*) AS cnt FROM ${table} ${where}`
    );
    return Number((rows[0] as { cnt: string }).cnt ?? 0);
  } catch {
    return 0;
  }
}

async function querySum(table: string, col: string, where = ""): Promise<number> {
  if (!sql) return 0;
  try {
    const rows = await sql.unsafe(
      `SELECT COALESCE(SUM(${col}), 0) AS s FROM ${table} ${where}`
    );
    return Number((rows[0] as { s: string }).s ?? 0);
  } catch {
    return 0;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "holding", "CRM Consolidado AWQ Group");
  if (denied) return denied;

  // Parallel queries across all BU CRM tables
  const [
    jacquesLeadsAtivos,
    jacquesOppsAbertas,
    jacquesPipelineTotal,
    jacquesClientesAtivos,
    jacquesMrr,
    jacquesWonCount,
    jacquesLostCount,

    cazaLeadsAtivos,
    cazaOppsAbertas,
    cazaPipelineTotal,
    cazaWonCount,
    cazaLostCount,

    advisorLeadsAtivos,
    advisorOppsAbertas,
    advisorPipelineTotal,
    advisorClientesAtivos,
    advisorMrr,
    advisorWonCount,
    advisorLostCount,

    ventureLeadsAtivos,
    ventureDealsAtivos,
    ventureTicketTotal,
    ventureFechados,
  ] = await Promise.all([
    // JACQES
    queryCount("jacqes_crm_leads",   "WHERE status NOT IN ('Convertido','Perdido')"),
    queryCount("jacqes_crm_opportunities", "WHERE stage NOT IN ('Fechado Ganho','Fechado Perdido')"),
    querySum("jacqes_crm_opportunities",   "valor_potencial", "WHERE stage NOT IN ('Fechado Ganho','Fechado Perdido')"),
    queryCount("jacqes_crm_clients",  "WHERE status_conta = 'Ativo'"),
    querySum("jacqes_crm_clients",    "ticket_mensal", "WHERE status_conta = 'Ativo'"),
    queryCount("jacqes_crm_opportunities", "WHERE stage = 'Fechado Ganho'"),
    queryCount("jacqes_crm_opportunities", "WHERE stage = 'Fechado Perdido'"),

    // CAZA
    queryCount("caza_crm_leads",   "WHERE status NOT IN ('Convertido','Perdido')"),
    queryCount("caza_crm_opportunities", "WHERE stage NOT IN ('Fechado Ganho','Fechado Perdido')"),
    querySum("caza_crm_opportunities",   "valor_estimado", "WHERE stage NOT IN ('Fechado Ganho','Fechado Perdido')"),
    queryCount("caza_crm_opportunities", "WHERE stage = 'Fechado Ganho'"),
    queryCount("caza_crm_opportunities", "WHERE stage = 'Fechado Perdido'"),

    // ADVISOR
    queryCount("advisor_crm_leads",   "WHERE status NOT IN ('Convertido','Perdido')"),
    queryCount("advisor_crm_opportunities", "WHERE stage NOT IN ('Fechado Ganho','Fechado Perdido')"),
    querySum("advisor_crm_opportunities",   "valor_estimado", "WHERE stage NOT IN ('Fechado Ganho','Fechado Perdido')"),
    queryCount("advisor_crm_clients",  "WHERE status_conta = 'Ativo'"),
    querySum("advisor_crm_clients",    "fee_mensal", "WHERE status_conta = 'Ativo'"),
    queryCount("advisor_crm_opportunities", "WHERE stage = 'Fechado Ganho'"),
    queryCount("advisor_crm_opportunities", "WHERE stage = 'Fechado Perdido'"),

    // VENTURE
    queryCount("venture_crm_leads",  "WHERE status IN ('Novo','Em Análise')"),
    queryCount("venture_crm_deals",  "WHERE stage NOT IN ('Fechado','Descartado')"),
    querySum("venture_crm_deals",    "ticket_midia", "WHERE stage NOT IN ('Fechado','Descartado')"),
    queryCount("venture_crm_deals",  "WHERE stage = 'Fechado'"),
  ]);

  // Per-BU metrics
  const bus = [
    {
      bu_code:         "JACQES",
      bu_name:         "JACQES Agência",
      href:            "/jacqes/crm",
      color:           "blue",
      leads_ativos:    jacquesLeadsAtivos,
      opps_abertas:    jacquesOppsAbertas,
      pipeline_total:  jacquesPipelineTotal,
      clientes_ativos: jacquesClientesAtivos,
      mrr:             jacquesMrr,
      won_count:       jacquesWonCount,
      lost_count:      jacquesLostCount,
      win_rate:        jacquesWonCount + jacquesLostCount > 0
        ? Math.round((jacquesWonCount / (jacquesWonCount + jacquesLostCount)) * 100)
        : 0,
    },
    {
      bu_code:         "CAZA",
      bu_name:         "Caza Vision",
      href:            "/caza-vision/crm",
      color:           "purple",
      leads_ativos:    cazaLeadsAtivos,
      opps_abertas:    cazaOppsAbertas,
      pipeline_total:  cazaPipelineTotal,
      clientes_ativos: 0,
      mrr:             0,
      won_count:       cazaWonCount,
      lost_count:      cazaLostCount,
      win_rate:        cazaWonCount + cazaLostCount > 0
        ? Math.round((cazaWonCount / (cazaWonCount + cazaLostCount)) * 100)
        : 0,
    },
    {
      bu_code:         "ADVISOR",
      bu_name:         "Advisor",
      href:            "/advisor/crm",
      color:           "violet",
      leads_ativos:    advisorLeadsAtivos,
      opps_abertas:    advisorOppsAbertas,
      pipeline_total:  advisorPipelineTotal,
      clientes_ativos: advisorClientesAtivos,
      mrr:             advisorMrr,
      won_count:       advisorWonCount,
      lost_count:      advisorLostCount,
      win_rate:        advisorWonCount + advisorLostCount > 0
        ? Math.round((advisorWonCount / (advisorWonCount + advisorLostCount)) * 100)
        : 0,
    },
    {
      bu_code:         "VENTURE",
      bu_name:         "AWQ Venture",
      href:            "/awq-venture/crm",
      color:           "orange",
      leads_ativos:    ventureLeadsAtivos,
      opps_abertas:    ventureDealsAtivos,
      pipeline_total:  ventureTicketTotal,
      clientes_ativos: 0,
      mrr:             0,
      won_count:       ventureFechados,
      lost_count:      0,
      win_rate:        0,
    },
  ];

  // Consolidated totals
  const totals = {
    pipeline_total:  bus.reduce((s, b) => s + b.pipeline_total, 0),
    opps_abertas:    bus.reduce((s, b) => s + b.opps_abertas, 0),
    leads_ativos:    bus.reduce((s, b) => s + b.leads_ativos, 0),
    clientes_ativos: bus.reduce((s, b) => s + b.clientes_ativos, 0),
    mrr_total:       bus.reduce((s, b) => s + b.mrr, 0),
    won_total:       bus.reduce((s, b) => s + b.won_count, 0),
  };

  return NextResponse.json({
    bus,
    totals,
    source: sql ? "db" : "empty",
  });
}
