import { NextRequest, NextResponse } from "next/server";
import { listMaintenance, createMaintenance, deleteMaintenance } from "@/lib/erp-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listMaintenance() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createMaintenance(await req.json()) }, { status: 201 });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteMaintenance(id);
  return NextResponse.json({ ok: true });
}
