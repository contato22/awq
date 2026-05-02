// POST /api/bpm/sla-check — Cron job: detecta e marca breaches de SLA
// Pode ser chamado via Vercel Cron (/vercel.json) ou manualmente.

import { NextRequest, NextResponse } from "next/server";
import { USE_DB, sql } from "@/lib/db";
import { initBpmDB, dbCheckAndUpdateSlaBreaches } from "@/lib/bpm-db";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Simple CRON_SECRET check to prevent abuse
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!USE_DB || !sql) {
      return NextResponse.json({ success: true, no_db: true, breaches_updated: 0 });
    }

    await initBpmDB();
    const updated = await dbCheckAndUpdateSlaBreaches();

    return NextResponse.json({ success: true, data: { breaches_updated: updated, checked_at: new Date().toISOString() } });
  } catch (err) {
    console.error("[bpm/sla-check]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

// Also support GET for Vercel Cron (which sends GET)
export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req);
}
