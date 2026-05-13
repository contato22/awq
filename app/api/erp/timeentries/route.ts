import { NextRequest, NextResponse } from "next/server";
import { listTimeEntries, createTimeEntry } from "@/lib/erp-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listTimeEntries() });
}
export async function POST(req: NextRequest) {
  return NextResponse.json({ data: await createTimeEntry(await req.json()) }, { status: 201 });
}
