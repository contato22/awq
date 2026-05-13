import { NextRequest, NextResponse } from "next/server";
import { listContractObligations, createContractObligation, deleteContractObligation } from "@/lib/erp-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listContractObligations() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createContractObligation(await req.json()) }, { status: 201 });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteContractObligation(id);
  return NextResponse.json({ ok: true });
}
