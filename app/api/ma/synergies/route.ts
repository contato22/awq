import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initMaDB, listSynergies, createSynergy, updateSynergy } from "@/lib/ma-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  const denied = await apiGuard(req, "view", "awq_venture", "MA Synergies");
  if (denied) return denied;

  try {
    await initMaDB();
    const p = req.nextUrl.searchParams;
    const filters: Record<string, string> = {};
    const portco_id  = p.get("portco_id");
    const source_bu  = p.get("source_bu");
    if (portco_id) filters.portco_id = portco_id;
    if (source_bu)  filters.source_bu = source_bu;
    const rows = await listSynergies(filters);
    return ok(rows);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  const denied = await apiGuard(req, "create", "awq_venture", "MA Synergies");
  if (denied) return denied;

  try {
    await initMaDB();
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create") {
      if (!data.opportunity_name) return err("opportunity_name required", 400);
      if (!data.synergy_type)     return err("synergy_type required", 400);
      const row = await createSynergy(data);
      return ok(row);
    }

    if (action === "update") {
      const { synergy_id, ...rest } = data;
      if (!synergy_id) return err("synergy_id required", 400);
      const row = await updateSynergy(synergy_id, rest);
      return ok(row);
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
