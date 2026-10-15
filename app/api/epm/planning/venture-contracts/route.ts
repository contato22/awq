import { NextRequest, NextResponse } from "next/server";
import { getVentureContracts, upsertVentureContract } from "@/lib/epm-planning-db";
import { sql } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const data = await getVentureContracts();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  await upsertVentureContract(body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!sql) return NextResponse.json({ error: "no db" }, { status: 503 });
  await sql`DELETE FROM epm_venture_contracts WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
