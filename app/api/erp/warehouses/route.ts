import { NextRequest, NextResponse } from "next/server";
import { listWarehouses, createWarehouse, deleteWarehouse } from "@/lib/erp-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listWarehouses() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createWarehouse(await req.json()) }, { status: 201 });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteWarehouse(id);
  return NextResponse.json({ ok: true });
}
