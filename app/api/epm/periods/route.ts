import { NextRequest, NextResponse } from "next/server";
import { listFiscalPeriods, createFiscalPeriod, updateFiscalPeriod, deleteFiscalPeriod } from "@/lib/epm-dynamic";
export const runtime = "nodejs";
export async function GET() { return NextResponse.json({ data: await listFiscalPeriods() }); }
export async function POST(req: NextRequest) { return NextResponse.json({ data: await createFiscalPeriod(await req.json()) }, { status: 201 }); }
export async function PATCH(req: NextRequest) {
  const { id, status, closed_by, checklist } = await req.json();
  const data = await updateFiscalPeriod(id, status, closed_by ?? "", checklist ?? []);
  return NextResponse.json({ data });
}
export async function DELETE(req: NextRequest) { const { id } = await req.json(); await deleteFiscalPeriod(id); return NextResponse.json({ ok: true }); }
