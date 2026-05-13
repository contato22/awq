import { NextRequest, NextResponse } from "next/server";
import { listInventoryMovements, createInventoryMovement, deleteInventoryMovement } from "@/lib/erp-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listInventoryMovements() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createInventoryMovement(await req.json()) }, { status: 201 });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteInventoryMovement(id);
  return NextResponse.json({ ok: true });
}
