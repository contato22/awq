import { NextRequest, NextResponse } from "next/server";
import { listDisposals, createDisposal, deleteDisposal } from "@/lib/erp-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listDisposals() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createDisposal(await req.json()) }, { status: 201 });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteDisposal(id);
  return NextResponse.json({ ok: true });
}
