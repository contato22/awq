import { NextRequest, NextResponse } from "next/server";
import { listKpis, createKpi, updateKpi, deleteKpi } from "@/lib/cpm-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listKpis() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createKpi(await req.json()) }, { status: 201 });
}
export async function PUT(req: NextRequest) {
  const { id, ...rest } = await req.json();
  const row = await updateKpi(id, rest);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ data: row });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteKpi(id);
  return NextResponse.json({ ok: true });
}
