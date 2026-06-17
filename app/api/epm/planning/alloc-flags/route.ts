import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { getAllocFlags, upsertAllocFlag } from "@/lib/epm-planning-db";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const denied = await apiGuard(req, "view", "financeiro", "EPM Planning Alloc Flags");
  if (denied) return denied;

  const data = await getAllocFlags();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const denied = await apiGuard(req, "create", "financeiro", "EPM Planning Alloc Flags");
  if (denied) return denied;

  const body = await req.json();
  const { buId, flag } = body as { buId: string; flag: string };
  await upsertAllocFlag(buId, flag);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await apiGuard(req, "delete", "financeiro", "EPM Planning Alloc Flags");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const buId = searchParams.get("id");
  if (!buId) return NextResponse.json({ error: "id (buId) required" }, { status: 400 });
  if (!sql) return NextResponse.json({ error: "no db" }, { status: 503 });
  await sql`DELETE FROM epm_alloc_flags WHERE bu_id = ${buId}`;
  return NextResponse.json({ ok: true });
}
