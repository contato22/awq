import { NextRequest, NextResponse } from "next/server";
import {
  initCrmDB,
  getLatestForecastSnapshot,
  listForecastSnapshots,
  createForecastSnapshot,
  markSnapshotSynced,
} from "@/lib/crm-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initCrmDB();
    const p = req.nextUrl.searchParams;
    const resource = p.get("resource");

    if (resource === "list") {
      return ok(await listForecastSnapshots());
    }

    const period_label = p.get("period_label") ?? undefined;
    const snap = await getLatestForecastSnapshot(period_label);
    return ok(snap);
  } catch (e) { return err(String(e), 500); }
}

export async function POST(req: NextRequest) {
  try {
    await initCrmDB();
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create_snapshot") {
      const snap = await createForecastSnapshot(data.created_by ?? "system");
      return ok(snap);
    }

    if (action === "mark_synced") {
      if (!data.snapshot_id) return err("snapshot_id required");
      await markSnapshotSynced(data.snapshot_id);
      return ok({ synced: true });
    }

    return err("Unknown action");
  } catch (e) { return err(String(e), 500); }
}
