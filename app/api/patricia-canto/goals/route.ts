import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/patricia-canto/auth";
import { getSetting, setSetting, logActivity } from "@/lib/patricia-canto/db";
import { DEFAULT_SALES_GOALS, monthKey, type SalesGoals } from "@/lib/patricia-canto/goals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Metas são gravadas por mês (uma chave por competência), não em um valor
// único global — senão editar a meta em qualquer mês sobrescreveria a meta
// de todos os outros meses, passados e futuros.
const LEGACY_KEY = "sales_goals"; // chave antiga, usada antes da mudança para armazenamento mês a mês
const MONTH_RE = /^\d{4}-\d{2}$/;

function resolveMonth(raw: string | null): string {
  if (raw && MONTH_RE.test(raw)) return raw;
  return monthKey(new Date().toISOString());
}

function storageKey(month: string): string {
  return `${LEGACY_KEY}:${month}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const role = requireSession(req);
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (role === "mkt") return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  const month = resolveMonth(req.nextUrl.searchParams.get("month"));
  try {
    // Fallback pra meta gravada antes desta mudança (chave antiga, sem mês),
    // pra não perder o valor já configurado em produção na migração.
    const legacy = await getSetting<SalesGoals | null>(LEGACY_KEY, null);
    const goals = await getSetting<SalesGoals>(storageKey(month), legacy ?? DEFAULT_SALES_GOALS);
    return NextResponse.json({ goals, month });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const role = requireSession(req);
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (role === "mkt") return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  try {
    const body = await req.json();
    const month = resolveMonth(body?.month ?? null);
    const goals: SalesGoals = body?.goals ?? body;
    await setSetting(storageKey(month), goals);
    await logActivity(role, `Atualizou metas de ${month} (vendas/recebimento)`);
    return NextResponse.json({ ok: true, month });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
