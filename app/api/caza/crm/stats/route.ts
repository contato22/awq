// GET /api/caza/crm/stats — KPIs consolidados do CRM Caza Vision
// Consumido pela página /caza-vision/crm (overview).
// ISOLADO de jacqes_crm_* — sem cross-BU.

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import {
  initCazaCrmDB,
  listLeads,
  listOpportunities,
  listProposals,
  listInteractions,
  CAZA_PIPELINE_STAGES,
} from "@/lib/caza-crm-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "caza_vision", "CRM Stats Caza Vision");
  if (denied) return denied;

  if (!sql) {
    return NextResponse.json({
      leads_total: 0, leads_ativos: 0, opps_abertas: 0, opps_ganhas: 0,
      opps_perdidas: 0, valor_pipeline: 0, valor_ganho: 0,
      propostas_enviadas: 0, propostas_aprovadas: 0,
      taxa_conversao: 0, ticket_medio_pipeline: 0,
      pipeline_by_stage: [], interacoes_recentes: [], source: "empty",
    });
  }

  await initCazaCrmDB();
  const [leads, opps, proposals, interactions] = await Promise.all([
    listLeads(),
    listOpportunities(),
    listProposals(),
    listInteractions(),
  ]);

  const leadsAtivos    = leads.filter((l) => l.status !== "Perdido" && l.status !== "Convertido").length;
  const oppsAbertas    = opps.filter((o) => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido").length;
  const oppsGanhas     = opps.filter((o) => o.stage === "Fechado Ganho").length;
  const oppsPerdidas   = opps.filter((o) => o.stage === "Fechado Perdido").length;
  const valorPipeline  = opps
    .filter((o) => o.stage !== "Fechado Perdido")
    .reduce((s, o) => s + o.valor_estimado, 0);
  const valorGanho     = opps
    .filter((o) => o.stage === "Fechado Ganho")
    .reduce((s, o) => s + o.valor_estimado, 0);
  const propEnviadas   = proposals.filter((p) => p.status !== "Em Elaboração").length;
  const propAprovadas  = proposals.filter((p) => p.status === "Aprovada").length;
  const totalFechadas  = oppsGanhas + oppsPerdidas;
  const taxaConversao  = totalFechadas > 0
    ? parseFloat(((oppsGanhas / totalFechadas) * 100).toFixed(1)) : 0;
  const ticketMedio    = oppsAbertas > 0
    ? Math.round(valorPipeline / oppsAbertas) : 0;

  const pipelineByStage = CAZA_PIPELINE_STAGES.map((stage) => {
    const stageOpps = opps.filter((o) => o.stage === stage);
    return {
      stage,
      count: stageOpps.length,
      valor: stageOpps.reduce((s, o) => s + o.valor_estimado, 0),
    };
  });

  const interacoesRecentes = interactions.slice(0, 10).map((i) => ({
    id: i.id,
    tipo: i.tipo,
    descricao: i.descricao,
    owner: i.owner,
    data: i.data,
    entidade_tipo: i.entidade_tipo,
    entidade_id: i.entidade_id,
  }));

  return NextResponse.json({
    leads_total:           leads.length,
    leads_ativos:          leadsAtivos,
    opps_abertas:          oppsAbertas,
    opps_ganhas:           oppsGanhas,
    opps_perdidas:         oppsPerdidas,
    valor_pipeline:        valorPipeline,
    valor_ganho:           valorGanho,
    propostas_enviadas:    propEnviadas,
    propostas_aprovadas:   propAprovadas,
    taxa_conversao:        taxaConversao,
    ticket_medio_pipeline: ticketMedio,
    pipeline_by_stage:     pipelineByStage,
    interacoes_recentes:   interacoesRecentes,
    source: "internal",
  });
}
