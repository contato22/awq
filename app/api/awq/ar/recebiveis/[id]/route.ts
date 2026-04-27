// GET    /api/awq/ar/recebiveis/[id]
// PATCH  /api/awq/ar/recebiveis/[id]
// DELETE /api/awq/ar/recebiveis/[id]

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { getARReceivable, updateARReceivable, deleteARReceivable } from "@/lib/ar-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export function generateStaticParams() { return [{ id: "_" }]; }

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "ar_module", "AR — Recebível");
  if (denied) return denied;
  if (!sql) return NextResponse.json({ error: "DB não disponível" }, { status: 503 });

  const item = await getARReceivable(params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "ar_module", "AR — Recebível");
  if (denied) return denied;
  if (!sql) return NextResponse.json({ error: "DB não disponível" }, { status: 503 });

  try {
    const body    = await req.json() as Record<string, unknown>;
    const actor   = String(body._actor ?? "");
    const updated = await updateARReceivable(
      params.id,
      body as Parameters<typeof updateARReceivable>[1],
      actor
    );
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "ar_module", "AR — Recebível");
  if (denied) return denied;
  if (!sql) return NextResponse.json({ error: "DB não disponível" }, { status: 503 });

  await deleteARReceivable(params.id);
  return NextResponse.json({ ok: true });
}
