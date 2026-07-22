import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/patricia-canto/auth";
import { upsertLead, deleteLead } from "@/lib/patricia-canto/db";
import type { Lead } from "@/lib/patricia-canto/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  if (!requireSession(req)) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const lead = (await req.json()) as Lead;
    if (lead.id !== params.id) return NextResponse.json({ error: "ID inconsistente" }, { status: 400 });
    await upsertLead(lead);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  if (!requireSession(req)) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    await deleteLead(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
