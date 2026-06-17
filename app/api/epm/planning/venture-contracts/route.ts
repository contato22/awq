import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { getVentureContracts, upsertVentureContract } from "@/lib/epm-planning-db";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const denied = await apiGuard(req, "view", "financeiro", "EPM Planning Venture Contracts");
  if (denied) return denied;

  const data = await getVentureContracts();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const denied = await apiGuard(req, "create", "financeiro", "EPM Planning Venture Contracts");
  if (denied) return denied;

  const body = await req.json();
  await upsertVentureContract(body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await apiGuard(req, "delete", "financeiro", "EPM Planning Venture Contracts");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!sql) return NextResponse.json({ error: "no db" }, { status: 503 });
  await sql`DELETE FROM epm_venture_contracts WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
