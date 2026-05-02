// GET /api/awq-venture/crm/stats — KPIs do CRM AWQ Venture
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { listLeads, listDeals, listInteractions, VENTURE_DEAL_STAGES } from "@/lib/venture-crm-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "awq_venture", "CRM Venture — Stats");
  if (denied) return denied;

  if (!sql) {
    return NextResponse.json({
      kpis: {
        leadsTotal: 0, dealsAtivos: 0, ticketMidiaTotal: 0,
        equityPotencial: 0, dealsFechados: 0, dealsDescartados: 0,
      },
      pipelineByStage: [],
      topDeals: [],
      source: "empty",
    });
  }

  const [leads, deals, interactions] = await Promise.all([
    listLeads(), listDeals(), listInteractions(),
  ]);

  const activeDeals   = deals.filter(d => !["Fechado", "Descartado"].includes(d.stage));
  const fechados      = deals.filter(d => d.stage === "Fechado");
  const descartados   = deals.filter(d => d.stage === "Descartado");
  const ticketTotal   = activeDeals.reduce((s, d) => s + d.ticket_midia, 0);
  const equityTotal   = activeDeals.reduce((s, d) => s + d.equity_percentual, 0);

  const pipelineByStage = VENTURE_DEAL_STAGES.map(stage => ({
    stage,
    count: deals.filter(d => d.stage === stage).length,
    ticket: deals.filter(d => d.stage === stage).reduce((s, d) => s + d.ticket_midia, 0),
  }));

  const topDeals = [...activeDeals]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return NextResponse.json({
    kpis: {
      leadsTotal:       leads.length,
      leadsNovos:       leads.filter(l => l.status === "Novo").length,
      dealsAtivos:      activeDeals.length,
      ticketMidiaTotal: ticketTotal,
      equityPotencial:  equityTotal,
      dealsFechados:    fechados.length,
      dealsDescartados: descartados.length,
    },
    pipelineByStage,
    topDeals,
    ultimasInteracoes: interactions.slice(0, 5),
    source: "internal",
  });
}
