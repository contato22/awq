import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/patricia-canto/auth";
import { upsertBusinessUnit, deleteBusinessUnit, logActivity } from "@/lib/patricia-canto/db";
import type { BusinessUnit } from "@/lib/patricia-canto/business-units";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const role = requireSession(req);
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (role === "mkt") return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  try {
    const unit = (await req.json()) as BusinessUnit;
    if (unit.id !== params.id) return NextResponse.json({ error: "ID inconsistente" }, { status: 400 });
    await upsertBusinessUnit(unit);
    await logActivity(role, `Atualizou unidade de negócio: ${unit.nome}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const role = requireSession(req);
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (role === "mkt") return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  try {
    await deleteBusinessUnit(params.id);
    await logActivity(role, `Removeu unidade de negócio: ${params.id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
