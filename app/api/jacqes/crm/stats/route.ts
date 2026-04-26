// GET /api/jacqes/crm/stats — visão geral do CRM JACQES
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import {
  listLeads, listOpportunities, listCrmClients,
  listTasks, listInteractions, listExpansion, listHealth,
  PIPELINE_STAGES,
} from "@/lib/jacqes-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // ── RBAC guard: view em jacqes ──
  const denied = await apiGuard(req, "view", "jacqes", "CRM JACQES — Stats");
  if (denied) return denied;

  let leads: Awaited<ReturnType<typeof listLeads>>,
      opps: Awaited<ReturnType<typeof listOpportunities>>,
      clients: Awaited<ReturnType<typeof listCrmClients>>,
      tasks: Awaited<ReturnType<typeof listTasks>>,
      interactions: Awaited<ReturnType<typeof listInteractions>>,
      expansion: Awaited<ReturnType<typeof listExpansion>>,
      health: Awaited<ReturnType<typeof listHealth>>;

  try {
    [leads, opps, clients, tasks, interactions, expansion, health] = await Promise.all([
      listLeads(), listOpportunities(), listCrmClients(),
      listTasks(), listInteractions(), listExpansion(), listHealth(),
    ]);
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao carregar dados CRM JACQES", detail: String(err) },
      { status: 500 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  // Pipeline por estágio
  const pipelineByStage = PIPELINE_STAGES.map(stage => ({
    stage,
    count: opps.filter(o => o.stage === stage).length,
    valor: opps.filter(o => o.stage === stage).reduce((s, o) => s + o.valor_potencial, 0),
  }));

  // Oportunidades abertas (não fechadas)
  const oppsAbertas = opps.filter(o => !o.stage.startsWith("Fechado"));
  const pipelineTotal = oppsAbertas.reduce((s, o) => s + o.valor_potencial, 0);
  const receitaPotencial = oppsAbertas.reduce((s, o) => s + (o.valor_potencial * o.probabilidade / 100), 0);

  // Fechados no mês
  const fechadosGanhos = opps.filter(o => o.stage === "Fechado Ganho" && (o.data_abertura ?? "").startsWith(thisMonth)).length;
  const fechadosPerdidos = opps.filter(o => o.stage === "Fechado Perdido" && (o.data_abertura ?? "").startsWith(thisMonth)).length;

  // Clientes
  const clientesAtivos = clients.filter(c => c.status_conta === "Ativo").length;
  const mrrTotal = clients.filter(c => c.status_conta === "Ativo").reduce((s, c) => s + c.ticket_mensal, 0);
  const healthMedio = clients.length > 0
    ? Math.round(clients.reduce((s, c) => s + c.health_score, 0) / clients.length)
    : 0;

  // Tarefas
  const tarefasAbertas  = tasks.filter(t => t.status !== "Concluída").length;
  const tarefasVencidas = tasks.filter(t => t.status !== "Concluída" && t.prazo && t.prazo < today).length;

  // Follow-ups pendentes (tasks de categoria follow-up abertas)
  const followupsPendentes = tasks.filter(t =>
    t.status !== "Concluída" && t.categoria.toLowerCase().includes("follow")
  ).length;

  // Expansão aberta
  const expansaoAberta = expansion.filter(e => e.status !== "Fechado" && e.status !== "Perdido").length;
  const expansaoValor = expansion
    .filter(e => e.status !== "Fechado" && e.status !== "Perdido")
    .reduce((s, e) => s + e.valor_potencial, 0);

  // Clientes em risco
  const emRisco = health.filter(h => h.churn_risk === "Alto").length;

  // Oportunidades críticas (risco Alto ou vencendo em 7 dias)
  const criticas = opps.filter(o =>
    !o.stage.startsWith("Fechado") && (
      o.risco === "Alto" ||
      (o.data_proxima_acao && o.data_proxima_acao <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
    )
  );

  // Win rate
  const totalFechados = opps.filter(o => o.stage.startsWith("Fechado")).length;
  const winRate = totalFechados > 0
    ? Math.round((opps.filter(o => o.stage === "Fechado Ganho").length / totalFechados) * 100)
    : 0;

  return NextResponse.json({
    kpis: {
      leadsAtivos:       leads.filter(l => l.status !== "Convertido" && l.status !== "Perdido").length,
      oppsAbertas:       oppsAbertas.length,
      pipelineTotal,
      receitaPotencial,
      propostasNegociacao: opps.filter(o => o.stage === "Negociação" || o.stage === "Proposta").length,
      fechadosGanhos,
      fechadosPerdidos,
      clientesAtivos,
      mrrTotal,
      healthMedio,
      expansaoAberta,
      expansaoValor,
      tarefasAbertas,
      tarefasVencidas,
      followupsPendentes,
      emRisco,
      winRate,
    },
    pipelineByStage,
    oportunidadesCriticas: criticas.slice(0, 5),
    ultimasInteracoes: interactions.slice(0, 5),
    tarefasUrgentes: tasks
      .filter(t => t.status !== "Concluída" && (t.prioridade === "Alta" || t.prioridade === "Crítica"))
      .slice(0, 5),
    source: "internal",
  });
}
