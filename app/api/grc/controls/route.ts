import { NextRequest, NextResponse } from "next/server";
import { listControls, createControl, updateControl, deleteControl } from "@/lib/grc-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listControls() });
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({ data: await createControl(body) }, { status: 201 });
}
export async function PUT(req: NextRequest) {
  const { id, ...rest } = await req.json();
  const row = await updateControl(id, rest);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ data: row });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteControl(id);
  return NextResponse.json({ ok: true });
}
