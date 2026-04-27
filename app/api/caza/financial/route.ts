// ─── GET /api/caza/financial — monthly financial aggregation

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaDB, listProjects } from "@/lib/caza-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
function monthLabel(isoDate: string): string | null {
  const p = isoDate.split("-");
  if (p.length < 2) return null;
  const m = parseInt(p[1], 10) - 1;
  if (m < 0 || m > 11 || isNaN(m)) return null;
  return `${MONTH_NAMES[m]}/${p[0].slice(2)}`;
}
function monthIndex(label: string): number {
  const [m, y] = label.split("/");
  const mi = MONTH_NAMES.indexOf(m);
  if (mi === -1 || !y) return 0;
  return parseInt("20" + y, 10) * 12 + mi;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "caza_vision", "Financeiro Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json([]);
  try {
    await initCazaDB();
    const projects = await listProjects();

    const map = new Map<string, {
      month: string; receita: number; alimentacao: number;
      gasolina: number; expenses: number; profit: number; orcamento: number;
    }>();
    for (const p of projects) {
      if (!p.prazo) continue;
      const label = monthLabel(p.prazo);
      if (!label) continue;
      const acc = map.get(label) ?? { month: label, receita: 0, alimentacao: 0, gasolina: 0, expenses: 0, profit: 0, orcamento: 0 };
      acc.receita += p.valor; acc.alimentacao += p.alimentacao; acc.gasolina += p.gasolina;
      acc.expenses += p.despesas; acc.profit += p.lucro; acc.orcamento += p.valor;
      map.set(label, acc);
    }

    const rows = Array.from(map.entries()).sort(([a], [b]) => monthIndex(a) - monthIndex(b)).map(([, row]) => row);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
