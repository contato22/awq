import { NextRequest, NextResponse } from "next/server";
import { getBUData, upsertBUData } from "@/lib/epm-planning-db";
import { sql } from "@/lib/db";

export async function GET() {
  const data = await getBUData();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  await upsertBUData(body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!sql) return NextResponse.json({ error: "no db" }, { status: 503 });
  await sql`DELETE FROM epm_bu_data WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
