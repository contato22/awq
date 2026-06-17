import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initMaDB, listMediaDeliverables, createMediaDeliverable, updateMediaDeliverable } from "@/lib/ma-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  const denied = await apiGuard(req, "view", "awq_venture", "MA Media");
  if (denied) return denied;

  try {
    await initMaDB();
    const p = req.nextUrl.searchParams;
    const portco_id = p.get("portco_id");
    if (!portco_id) return err("portco_id required", 400);
    const rows = await listMediaDeliverables(portco_id);
    return ok(rows);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  const denied = await apiGuard(req, "create", "awq_venture", "MA Media");
  if (denied) return denied;

  try {
    await initMaDB();
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create") {
      if (!data.portco_id)        return err("portco_id required", 400);
      if (!data.deliverable_type) return err("deliverable_type required", 400);
      const row = await createMediaDeliverable(data);
      return ok(row);
    }

    if (action === "update") {
      const { deliverable_id, ...rest } = data;
      if (!deliverable_id) return err("deliverable_id required", 400);
      const row = await updateMediaDeliverable(deliverable_id, rest);
      return ok(row);
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
