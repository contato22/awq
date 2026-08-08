import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/patricia-canto/auth";
import { getBusinessUnits, upsertBusinessUnit, logActivity } from "@/lib/patricia-canto/db";
import type { BusinessUnit } from "@/lib/patricia-canto/business-units";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET fica aberto a qualquer role autenticada (inclusive mkt) — Ana precisa
// da lista pra marcar a unidade das próprias ações de GTM/comunicação.
// Criar/editar/desativar unidade (POST/PATCH/DELETE) é só admin/master.
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!requireSession(req)) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const businessUnits = await getBusinessUnits();
    return NextResponse.json({ businessUnits });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const role = requireSession(req);
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (role === "mkt") return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  try {
    const unit = (await req.json()) as BusinessUnit;
    await upsertBusinessUnit(unit);
    await logActivity(role, `Criou unidade de negócio: ${unit.nome}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
