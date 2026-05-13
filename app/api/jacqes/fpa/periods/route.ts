import { NextRequest, NextResponse } from "next/server";
import { listPeriods, upsertPeriod } from "@/lib/jacqes-fpa-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listPeriods() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await upsertPeriod(await req.json()) }, { status: 201 });
}
