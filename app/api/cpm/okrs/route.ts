import { NextRequest, NextResponse } from "next/server";
import { listOkrs, createOkr, updateOkr, deleteOkr } from "@/lib/cpm-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listOkrs() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createOkr(await req.json()) }, { status: 201 });
}
export async function PUT(req: NextRequest) {
  const { id, ...rest } = await req.json();
  const row = await updateOkr(id, rest);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ data: row });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteOkr(id);
  return NextResponse.json({ ok: true });
}
