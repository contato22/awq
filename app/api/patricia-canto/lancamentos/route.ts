import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/patricia-canto/auth";
import { getLancamentos, upsertLancamento, logActivity } from "@/lib/patricia-canto/db";
import type { Lancamento } from "@/lib/patricia-canto/financeiro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const role = requireSession(req);
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (role === "mkt") return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  try {
    const lancamentos = await getLancamentos();
    return NextResponse.json({ lancamentos });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const role = requireSession(req);
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (role === "mkt") return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  try {
    const item = (await req.json()) as Lancamento;
    await upsertLancamento(item);
    await logActivity(role, `Criou lançamento (${item.tipo}): ${item.contraparte}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
