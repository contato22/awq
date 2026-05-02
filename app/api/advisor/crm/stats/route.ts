// GET /api/advisor/crm/stats — KPIs consolidados do CRM Advisor
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import {
  listLeads, listOpportunities, listCrmClients,
  listInteractions, listTasks, listProposals,
  ADVISOR_PIPELINE_STAGES,
} from "@/lib/advisor-crm-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "advisor", "CRM Advisor — Stats");
  if (denied) return denied;

  if (!sql) {
    return NextResponse.json({
      kpis: {
        leadsAtivos: 0, oppsAbertas: 0, pipelineTotal: 0,
        receitaPotencial: 0, propostasNegociacao: 0, winRate: 0,
        clientesAtivos: 0, mrrTotal: 0, healthMedio: 0,
        tarefasAbertas: 0, tarefasVencidas: 0, followupsPendentes: 0,
      },
      pipelineByStage: [],
      oportunidadesCriticas: [],
      ultimasInteracoes: [],
      tarefasUrgentes: [],
      source: "empty",
    });
  }

  const [leads, opps, clients, interactions, tasks] = await Promise.all([
    listLeads(), listOpportunities(), listCrmClients(),
    listInteractions(), listTasks(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const today7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const oppsAbertas = opps.filter(o => !o.stage.startsWith("Fechado"));
  const pipelineTotal = oppsAbertas.reduce((s, o) => s + o.valor_estimado, 0);
  const receitaPotencial = Math.round(oppsAbertas.reduce((s, o) => s + o.valor_estimado * o.probabilidade / 100, 0));

  const fechadosGanhos   = opps.filter(o => o.stage === "Fechado Ganho").length;
  const fechadosPerdidos = opps.filter(o => o.stage === "Fechado Perdido").length;
  const totalFechados    = fechadosGanhos + fechadosPerdidos;

  const clientesAtivos = clients.filter(c => c.status_conta === "Ativo");
  const mrrTotal = clientesAtivos.reduce((s, c) => s + c.fee_mensal, 0);
  const healthMedio = clientesAtivos.length > 0
    ? Math.round(clientesAtivos.reduce((s, c) => s + c.health_score, 0) / clientesAtivos.length)
    : 0;

  const tarefasAbertas  = tasks.filter(t => t.status !== "Concluída").length;
  const tarefasVencidas = tasks.filter(t => t.status !== "Concluída" && t.prazo && t.prazo < today).length;
  const followupsPendentes = tasks.filter(t =>
    t.status !== "Concluída" && t.categoria.toLowerCase().includes("follow")
  ).length;

  const pipelineByStage = ADVISOR_PIPELINE_STAGES.map(stage => ({
    stage,
    count: opps.filter(o => o.stage === stage).length,
    valor: opps.filter(o => o.stage === stage).reduce((s, o) => s + o.valor_estimado, 0),
  }));

  const oportunidadesCriticas = opps
    .filter(o => !o.stage.startsWith("Fechado") && (
      o.risco === "Alto" ||
      (o.data_proxima_acao && o.data_proxima_acao <= today7)
    ))
    .slice(0, 5);

  return NextResponse.json({
    kpis: {
      leadsAtivos:          leads.filter(l => l.status !== "Convertido" && l.status !== "Perdido").length,
      oppsAbertas:          oppsAbertas.length,
      pipelineTotal,
      receitaPotencial,
      propostasNegociacao:  opps.filter(o => o.stage === "Proposta" || o.stage === "Negociação").length,
      winRate:              totalFechados > 0 ? Math.round((fechadosGanhos / totalFechados) * 100) : 0,
      clientesAtivos:       clientesAtivos.length,
      mrrTotal,
      healthMedio,
      tarefasAbertas,
      tarefasVencidas,
      followupsPendentes,
    },
    pipelineByStage,
    oportunidadesCriticas,
    ultimasInteracoes: interactions.slice(0, 5),
    tarefasUrgentes: tasks
      .filter(t => t.status !== "Concluída" && (t.prioridade === "Alta" || t.prioridade === "Crítica"))
      .slice(0, 5),
    source: "internal",
  });
}
