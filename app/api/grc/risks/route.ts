import { NextRequest, NextResponse } from "next/server";
import { listRisks, createRisk, updateRisk, deleteRisk } from "@/lib/grc-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listRisks() });
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const row = await createRisk(body);
  return NextResponse.json({ data: row }, { status: 201 });
}
export async function PUT(req: NextRequest) {
  const { id, ...rest } = await req.json();
  const row = await updateRisk(id, rest);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ data: row });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteRisk(id);
  return NextResponse.json({ ok: true });
}
