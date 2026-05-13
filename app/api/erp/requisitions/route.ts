import { NextRequest, NextResponse } from "next/server";
import { listRequisitions, createRequisition, deleteRequisition } from "@/lib/erp-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listRequisitions() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createRequisition(await req.json()) }, { status: 201 });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteRequisition(id);
  return NextResponse.json({ ok: true });
}
