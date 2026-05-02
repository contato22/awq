// GET /api/bpm/analytics — Performance, SLA e bottlenecks

import { NextRequest, NextResponse } from "next/server";
import { USE_DB, sql } from "@/lib/db";
import { initBpmDB, dbGetPerformance, dbGetBottlenecks } from "@/lib/bpm-db";

export const runtime = "nodejs";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    if (!USE_DB || !sql) {
      return NextResponse.json({ success: true, no_db: true, data: { performance: [], bottlenecks: [] } });
    }

    await initBpmDB();
    const [performance, bottlenecks] = await Promise.all([
      dbGetPerformance(),
      dbGetBottlenecks(),
    ]);

    return NextResponse.json({ success: true, data: { performance, bottlenecks } });
  } catch (err) {
    console.error("[bpm/analytics]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
