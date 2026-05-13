import { NextRequest, NextResponse } from "next/server";
import { listReports, createReport, deleteReport } from "@/lib/bi-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const dashId = new URL(req.url).searchParams.get("dashboard_id") ?? undefined;
  return NextResponse.json({ data: await listReports(dashId) });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createReport(await req.json()) }, { status: 201 });
}
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteReport(id);
  return NextResponse.json({ ok: true });
}
