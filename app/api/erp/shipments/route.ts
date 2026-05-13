import { NextRequest, NextResponse } from "next/server";
import { listShipments, createShipment, deleteShipment } from "@/lib/erp-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listShipments() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createShipment(await req.json()) }, { status: 201 });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteShipment(id);
  return NextResponse.json({ ok: true });
}
