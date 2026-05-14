import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, listLeads, createLead, updateLead, convertLead, deleteLead } from "@/lib/crm-db";
import { getForcedBu } from "@/lib/api-guard";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initCrmDB();
    const p = req.nextUrl.searchParams;
    const forcedBu = await getForcedBu(req);
    const rows = await listLeads({
      status:      p.get("status")      ?? undefined,
      bu:          forcedBu ?? p.get("bu") ?? undefined,
      assigned_to: p.get("assigned_to") ?? undefined,
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
      if (!data.company_name?.trim()) return err("company_name required", 400);
      if (!data.contact_name?.trim()) return err("contact_name required", 400);
      if (!data.bu) return err("bu required", 400);
      const row = await createLead(data);
      return ok(row);
    }
    if (action === "update") {
      const { lead_id, ...rest } = data;
      if (!lead_id) return err("lead_id required", 400);
      const row = await updateLead(lead_id, rest);
      return ok(row);
    }
    if (action === "convert") {
      const { lead_id, ...oppData } = data;
      if (!lead_id) return err("lead_id required", 400);
      const opp = await convertLead(lead_id, oppData);
      return ok(opp);
    }
    if (action === "delete") {
      const { lead_id } = data;
      if (!lead_id) return err("lead_id required", 400);
      await deleteLead(lead_id);
      return ok(null);
    }
    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
