import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, listOpportunities, getOpportunity, createOpportunity, updateOpportunity, deleteOpportunity } from "@/lib/crm-db";
import { getForcedBu } from "@/lib/api-guard";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initCrmDB();
    const p = req.nextUrl.searchParams;
    const forcedBu = await getForcedBu(req);
    const id = p.get("id");
    if (id) {
      const row = await getOpportunity(id);
      if (!row) return err("Not found", 404);
      // Block cross-BU access on single-record fetch
      if (forcedBu && row.bu !== forcedBu) return err("Not found", 404);
      return ok(row);
    }
    const rows = await listOpportunities({
      stage:      p.get("stage")      ?? undefined,
      bu:         forcedBu ?? p.get("bu") ?? undefined,
      owner:      p.get("owner")      ?? undefined,
      account_id: p.get("account_id") ?? undefined,
    });
    return ok(rows);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    await initCrmDB();
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
      const row = await updateOpportunity(opportunity_id, rest);
      return ok(row);
    }
    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}

export async function DELETE(req: NextRequest) {
  try {
    await initCrmDB();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return err("id required", 400);
    await deleteOpportunity(id);
    return NextResponse.json({ success: true });
  } catch (e) { return err(String(e)); }
}
