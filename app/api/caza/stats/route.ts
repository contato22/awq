// ─── GET /api/caza/stats — KPIs Caza Vision

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaDB, listProjects, listClients } from "@/lib/caza-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const currentYear = new Date().getFullYear();

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "caza_vision", "KPIs Caza Vision");
  if (denied) return denied;

  if (!sql) {
    return NextResponse.json({
      kpis: [], revenueData: [], pipeline: [], projectTypeRevenue: [], source: "empty",
    });
  }

  await initCazaDB();
  const [projects, clients] = await Promise.all([listProjects(), listClients()]);

  const activeProjects    = projects.filter(p => !p.recebido).length;
  const deliveredProjects = projects.filter(p => p.recebido).length;
  const receitaYtd        = projects.filter(p => p.prazo.startsWith(String(currentYear))).reduce((s, p) => s + p.valor, 0);
  const receitaTotal      = projects.reduce((s, p) => s + p.valor, 0);
  const totalDespesas     = projects.reduce((s, p) => s + p.despesas, 0);
  const totalLucro        = projects.reduce((s, p) => s + p.lucro, 0);
  const margemMedia       = receitaTotal > 0 ? parseFloat(((totalLucro / receitaTotal) * 100).toFixed(1)) : 0;
  const ticketMedio       = projects.length > 0 ? Math.round(receitaTotal / projects.length) : 0;
  const taxaEntrega       = projects.length > 0 ? parseFloat(((deliveredProjects / projects.length) * 100).toFixed(1)) : 0;
  const clientesAtivos    = clients.filter(c => c.status === "Ativo").length;
  const today             = new Date().toISOString().slice(0, 10);
  const projetosProximos  = projects.filter(p => !p.recebido && p.prazo >= today).length;

  const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const monthMap = new Map<string, { month: string; receita: number; expenses: number; profit: number; orcamento: number }>();
  for (const p of projects) {
    if (!p.prazo) continue;
    const parts = p.prazo.split("-");
    const m     = parseInt(parts[1], 10) - 1;
    const label = `${MONTH_NAMES[m]}/${parts[0].slice(2)}`;
    const acc   = monthMap.get(label) ?? { month: label, receita: 0, expenses: 0, profit: 0, orcamento: 0 };
    acc.receita   += p.valor;
    acc.expenses  += p.despesas;
    acc.profit    += p.lucro;
    acc.orcamento += p.valor;
    monthMap.set(label, acc);
  }
  function monthIdx(label: string) {
    const [m, y] = label.split("/");
    return parseInt("20" + y, 10) * 12 + MONTH_NAMES.indexOf(m);
  }
  const revenueData = Array.from(monthMap.values()).sort((a, b) => monthIdx(a.month) - monthIdx(b.month)).slice(-12);

  const stageMap = new Map<string, number>();
  for (const p of projects) { const stage = p.status || "Em Produção"; stageMap.set(stage, (stageMap.get(stage) ?? 0) + 1); }
  const pipeline = Array.from(stageMap.entries()).map(([stage, count]) => ({ stage, count }));

  const typeMap = new Map<string, { projetos: number; receita: number }>();
  for (const p of projects) {
    const tipo = p.tipo || "Outros";
    const acc  = typeMap.get(tipo) ?? { projetos: 0, receita: 0 };
    acc.projetos++; acc.receita += p.valor; typeMap.set(tipo, acc);
  }
  const projectTypeRevenue = Array.from(typeMap.entries()).map(([type, d]) => ({
    type, projetos: d.projetos, receita: d.receita, avgValue: d.projetos > 0 ? Math.round(d.receita / d.projetos) : 0,
  }));

  return NextResponse.json({
    kpis: [
      { id: "projetos", label: "Projetos Ativos", value: activeProjects, unit: "number", icon: "Building2", color: "emerald" },
      { id: "receita", label: "Receita YTD", value: receitaYtd, unit: "currency", icon: "DollarSign", color: "brand" },
      { id: "entregues", label: "Projetos Entregues", value: deliveredProjects, unit: "number", icon: "HandshakeIcon", color: "violet" },
      { id: "ticket", label: "Ticket Médio", value: ticketMedio, unit: "currency", icon: "TrendingUp", color: "amber" },
      { id: "total_projetos", label: "Total de Projetos", value: projects.length, unit: "number", icon: "Film", color: "brand" },
      { id: "receita_total", label: "Receita Total", value: receitaTotal, unit: "currency", icon: "DollarSign", color: "emerald" },
      { id: "taxa_entrega", label: "Taxa de Entrega", value: taxaEntrega, unit: "percent", icon: "CheckCircle", color: "violet" },
      { id: "clientes_ativos", label: "Clientes Ativos", value: clientesAtivos, unit: "number", icon: "Users", color: "amber" },
    ],
    revenueData, pipeline, projectTypeRevenue,
    clients_total: clients.length, projects_total: projects.length,
    total_despesas: totalDespesas, total_lucro: totalLucro, margem_media: margemMedia,
    projetos_proximos: projetosProximos, source: "internal",
  });
}
