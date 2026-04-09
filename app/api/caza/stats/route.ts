// ─── GET /api/caza/stats
//
// Computes KPIs and overview data from the internal caza_projects + caza_clients tables.
// Notion is NOT consulted here.

import { NextResponse } from "next/server";
import { initCazaDB, listProjects, listClients } from "@/lib/caza-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const currentYear = new Date().getFullYear();

export async function GET(): Promise<NextResponse> {
  if (!sql) {
    return NextResponse.json({
      kpis: [], revenueData: [], pipeline: [], projectTypeRevenue: [], source: "empty",
    });
  }

  await initCazaDB();
  const [projects, clients] = await Promise.all([listProjects(), listClients()]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const activeProjects    = projects.filter(p => !p.recebido).length;
  const deliveredProjects = projects.filter(p => p.recebido).length;
  const receitaYtd        = projects
    .filter(p => p.prazo.startsWith(String(currentYear)))
    .reduce((s, p) => s + p.valor, 0);
  const ticketMedio       = projects.length > 0
    ? Math.round(projects.reduce((s, p) => s + p.valor, 0) / projects.length)
    : 0;

  // ── Revenue by month (last 12) ─────────────────────────────────────────────
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

  const revenueData = Array.from(monthMap.values())
    .sort((a, b) => monthIdx(a.month) - monthIdx(b.month))
    .slice(-12);

  // ── Pipeline by status ─────────────────────────────────────────────────────
  const stageMap = new Map<string, number>();
  for (const p of projects) {
    const stage = p.status || "Em Produção";
    stageMap.set(stage, (stageMap.get(stage) ?? 0) + 1);
  }
  const pipeline = Array.from(stageMap.entries()).map(([stage, count]) => ({ stage, count }));

  // ── Revenue by project type ────────────────────────────────────────────────
  const typeMap = new Map<string, { projetos: number; receita: number }>();
  for (const p of projects) {
    const tipo = p.tipo || "Outros";
    const acc  = typeMap.get(tipo) ?? { projetos: 0, receita: 0 };
    acc.projetos++;
    acc.receita += p.valor;
    typeMap.set(tipo, acc);
  }
  const projectTypeRevenue = Array.from(typeMap.entries()).map(([type, d]) => ({
    type,
    projetos: d.projetos,
    receita:  d.receita,
    avgValue: d.projetos > 0 ? Math.round(d.receita / d.projetos) : 0,
  }));

  return NextResponse.json({
    kpis: [
      { id: "projetos",  label: "Projetos Ativos",    value: activeProjects,    unit: "number",   icon: "Building2",     color: "emerald" },
      { id: "receita",   label: "Receita YTD",         value: receitaYtd,        unit: "currency", icon: "DollarSign",    color: "brand"   },
      { id: "entregues", label: "Projetos Entregues",  value: deliveredProjects, unit: "number",   icon: "HandshakeIcon", color: "violet"  },
      { id: "ticket",    label: "Ticket Médio",        value: ticketMedio,       unit: "currency", icon: "TrendingUp",    color: "amber"   },
    ],
    revenueData,
    pipeline,
    projectTypeRevenue,
    clients_total:  clients.length,
    projects_total: projects.length,
    source: "internal",
  });
}
