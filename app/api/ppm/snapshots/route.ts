import { NextRequest, NextResponse } from "next/server";
import { listSnapshots, saveSnapshot } from "@/lib/ppm-db";
import type { SnapshotGranularity, BuCode } from "@/lib/ppm-types";

function ok(data: unknown)         { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400) { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const snapshots = await listSnapshots({
      granularity: (p.get("granularity") ?? undefined) as SnapshotGranularity | undefined,
      bu_code:     (p.get("bu_code")     ?? undefined) as BuCode | undefined,
      from_date:    p.get("from_date")   ?? undefined,
      to_date:      p.get("to_date")     ?? undefined,
      limit:        p.get("limit") ? Number(p.get("limit")) : undefined,
    });
    return ok(snapshots);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

// POST /api/ppm/snapshots  { granularity: "day"|"month"|"year", bu_code?: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const granularity = body.granularity as SnapshotGranularity;
    if (!["day", "month", "year"].includes(granularity)) {
      return err("granularity must be day, month or year");
    }
    const snapshot = await saveSnapshot(granularity, body.bu_code ?? undefined);
    return ok(snapshot);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
