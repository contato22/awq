import { NextRequest, NextResponse } from "next/server";
import { listInvoices, createInvoice, deleteInvoice } from "@/lib/erp-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listInvoices() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createInvoice(await req.json()) }, { status: 201 });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteInvoice(id);
  return NextResponse.json({ ok: true });
}
