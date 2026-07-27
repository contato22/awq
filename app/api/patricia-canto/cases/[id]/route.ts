import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/patricia-canto/auth";
import { upsertCase, deleteCase } from "@/lib/patricia-canto/db";
import type { CaseItem } from "@/lib/patricia-canto/cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const role = requireSession(req);
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (role === "mkt") return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  try {
    const item = (await req.json()) as CaseItem;
    if (item.id !== params.id) return NextResponse.json({ error: "ID inconsistente" }, { status: 400 });
    await upsertCase(item);
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
    await deleteCase(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
