export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { listAllocFlags, upsertAllocFlag } from "@/lib/bank-db";

export async function GET() {
  try {
    const rows = await listAllocFlags();
    return NextResponse.json({ data: rows });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { bu_id, flag, capital_allocated } = body;
    const row = await upsertAllocFlag(bu_id, flag, Number(capital_allocated ?? 0));
    return NextResponse.json({ data: row });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
