import { NextRequest, NextResponse } from "next/server";
import { listAudits, createAudit, updateAudit, deleteAudit } from "@/lib/grc-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listAudits() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createAudit(await req.json()) }, { status: 201 });
}
export async function PUT(req: NextRequest) {
  const { id, ...rest } = await req.json();
  const row = await updateAudit(id, rest);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ data: row });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteAudit(id);
  return NextResponse.json({ ok: true });
}
