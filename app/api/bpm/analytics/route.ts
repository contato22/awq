// ─── GET /api/bpm/analytics?view= ────────────────────────────────────────────
// BPM analytics views.
// Query: view = performance | sla | bottlenecks | all (default: all)
// Response: { success, data: { performance, sla, bottlenecks } }

import { NextRequest, NextResponse } from "next/server";
import {
  initBpmDB,
  getProcessPerformance,
  getSlaDashboard,
  getBottlenecks,
} from "@/lib/bpm-db";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initBpmDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const view = req.nextUrl.searchParams.get("view") ?? "all";

    if (view === "performance") {
      return ok(await getProcessPerformance());
    }
    if (view === "sla") {
      return ok(await getSlaDashboard());
    }
    if (view === "bottlenecks") {
      return ok(await getBottlenecks());
    }

    // Default: return all
    const [performance, sla, bottlenecks] = await Promise.all([
      getProcessPerformance(),
      getSlaDashboard(),
      getBottlenecks(),
    ]);

    return ok({ performance, sla, bottlenecks });
  } catch (e) {
    console.error("[bpm/analytics]", e);
    return err(String(e), 500);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
