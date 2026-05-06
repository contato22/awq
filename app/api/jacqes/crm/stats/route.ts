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

  const [leads, opps, clients, tasks, interactions, expansion, health] = await Promise.all([
    listLeads(), listOpportunities(), listCrmClients(),
    listTasks(), listInteractions(), listExpansion(), listHealth(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  const thisYear  = today.slice(0, 4);
  // Monday of the current ISO week
  const d = new Date(); const dow = d.getDay();
  const diff = d.getDate() - dow + (dow === 0 ? -6 : 1);
  d.setDate(diff); d.setHours(0, 0, 0, 0);
  const weekStart = d.toISOString().slice(0, 10);

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

  // Fecha data canônica: usa data_fechamento_prevista; cai em data_abertura se nula
  const closeDate = (o: (typeof opps)[0]) => o.data_fechamento_prevista ?? o.data_abertura ?? "";

  // Fechados no dia
  const fechadosGanhosHoje    = opps.filter(o => o.stage === "Fechado Ganho"   && closeDate(o) === today).length;
  const fechadosPerdidosHoje  = opps.filter(o => o.stage === "Fechado Perdido" && closeDate(o) === today).length;

  // Fechados na semana
  const fechadosGanhosSemana   = opps.filter(o => o.stage === "Fechado Ganho"   && closeDate(o) >= weekStart).length;
  const fechadosPerdidosSemana = opps.filter(o => o.stage === "Fechado Perdido" && closeDate(o) >= weekStart).length;
  const receitaSemana = opps.filter(o => o.stage === "Fechado Ganho" && closeDate(o) >= weekStart)
    .reduce((s, o) => s + o.valor_potencial, 0);

  // Fechados no mês
  const fechadosGanhos    = opps.filter(o => o.stage === "Fechado Ganho"   && closeDate(o).startsWith(thisMonth)).length;
  const fechadosPerdidos  = opps.filter(o => o.stage === "Fechado Perdido" && closeDate(o).startsWith(thisMonth)).length;
  const receitaMes = opps.filter(o => o.stage === "Fechado Ganho" && closeDate(o).startsWith(thisMonth))
    .reduce((s, o) => s + o.valor_potencial, 0);

  // Fechados no ano
  const fechadosGanhosAno   = opps.filter(o => o.stage === "Fechado Ganho"   && closeDate(o).startsWith(thisYear)).length;
  const fechadosPerdidosAno = opps.filter(o => o.stage === "Fechado Perdido" && closeDate(o).startsWith(thisYear)).length;
  const receitaAno = opps.filter(o => o.stage === "Fechado Ganho" && closeDate(o).startsWith(thisYear))
    .reduce((s, o) => s + o.valor_potencial, 0);

  // Leads por período
  const leadsHoje   = leads.filter(l => l.data_entrada === today).length;
  const leadsSemana = leads.filter(l => l.data_entrada >= weekStart).length;
  const leadsMes    = leads.filter(l => (l.data_entrada ?? "").startsWith(thisMonth)).length;
  const leadsAno    = leads.filter(l => (l.data_entrada ?? "").startsWith(thisYear)).length;

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
      // Fechados por período (usando data_fechamento_prevista como data canônica)
      fechadosGanhosHoje,
      fechadosPerdidosHoje,
      fechadosGanhosSemana,
      fechadosPerdidosSemana,
      receitaSemana,
      fechadosGanhos,      // mês
      fechadosPerdidos,    // mês
      receitaMes,
      fechadosGanhosAno,
      fechadosPerdidosAno,
      receitaAno,
      // Leads por período
      leadsHoje,
      leadsSemana,
      leadsMes,
      leadsAno,
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
