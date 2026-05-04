import { NextRequest, NextResponse } from "next/server";
import {
  initCrmDB,
  listQuotaTargets,
  upsertQuotaTarget,
  getQuotaAttainments,
} from "@/lib/crm-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initCrmDB();
    const p = req.nextUrl.searchParams;
    const resource = p.get("resource");
    const opts = {
      owner:        p.get("owner")        ?? undefined,
      bu:           p.get("bu")           ?? undefined,
      period_type:  p.get("period_type")  ?? undefined,
      period_label: p.get("period_label") ?? undefined,
    };

    if (resource === "targets") {
      return ok(await listQuotaTargets(opts));
    }

    // Default: attainments with actuals
    return ok(await getQuotaAttainments(opts));
  } catch (e) { return err(String(e), 500); }
}

export async function POST(req: NextRequest) {
  try {
    await initCrmDB();
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "upsert") {
      if (!data.owner)        return err("owner required");
      if (!data.bu)           return err("bu required");
      if (!data.period_type)  return err("period_type required");
      if (!data.period_label) return err("period_label required");
      if (data.revenue_target == null) return err("revenue_target required");
      const row = await upsertQuotaTarget(data);
      return ok(row);
    }

    return err("Unknown action");
  } catch (e) { return err(String(e), 500); }
}
