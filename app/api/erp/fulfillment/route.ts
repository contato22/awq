import { NextRequest, NextResponse } from "next/server";
import { listFulfillment, createFulfillment, deleteFulfillment } from "@/lib/erp-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listFulfillment() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createFulfillment(await req.json()) }, { status: 201 });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteFulfillment(id);
  return NextResponse.json({ ok: true });
}
