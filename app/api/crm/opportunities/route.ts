import { NextRequest, NextResponse } from "next/server";
import { listOpportunities, getOpportunity, createOpportunity, updateOpportunity, deleteOpportunity } from "@/lib/crm-db";
import { STAGE_PROBABILITY } from "@/lib/crm-types";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const id = p.get("id");
    if (id) {
      const row = await getOpportunity(id);
      if (!row) return err("Not found", 404);
      return ok(row);
    }
    const rows = await listOpportunities({
      bu:         p.get("bu")         ?? undefined,
      stage:      p.get("stage")      ?? undefined,
      owner:      p.get("owner")      ?? undefined,
      account_id: p.get("account_id") ?? undefined,
    });
    return ok(rows);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create") {
      if (!data.opportunity_name || !data.bu) return err("opportunity_name and bu required", 400);
      const row = await createOpportunity(data);
      return ok(row);
    }

    if (action === "update" || action === "close") {
      const { opportunity_id, ...rest } = data;
      if (!opportunity_id) return err("opportunity_id required", 400);
      if (rest.stage) rest.probability = STAGE_PROBABILITY[rest.stage as keyof typeof STAGE_PROBABILITY] ?? rest.probability;
      const row = await updateOpportunity(opportunity_id, rest);
      return ok(row);
    }

    if (action === "delete") {
      const { opportunity_id } = data;
      if (!opportunity_id) return err("opportunity_id required", 400);
      await deleteOpportunity(opportunity_id);
      return ok({ deleted: true });
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
