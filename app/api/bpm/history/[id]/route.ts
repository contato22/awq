// GET /api/bpm/history/[id] — Audit trail de uma instância

import { NextRequest, NextResponse } from "next/server";
import { USE_DB, sql } from "@/lib/db";
import { initBpmDB, dbGetHistory } from "@/lib/bpm-db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!USE_DB || !sql) {
      return NextResponse.json({ success: true, no_db: true, data: [] });
    }

    await initBpmDB();
    const history = await dbGetHistory(id);

    return NextResponse.json({ success: true, data: history });
  } catch (err) {
    console.error("[bpm/history/[id]]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
