import { NextRequest, NextResponse } from "next/server";
import { initMaDB, listPortcoKpis, upsertPortcoKpi } from "@/lib/ma-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initMaDB();
    const p = req.nextUrl.searchParams;
    const portco_id = p.get("portco_id");
    if (!portco_id) return err("portco_id required", 400);
    const rows = await listPortcoKpis(portco_id);
    return ok(rows);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    await initMaDB();
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "upsert") {
      if (!data.portco_id)       return err("portco_id required", 400);
      if (!data.reporting_date)  return err("reporting_date required", 400);
      const row = await upsertPortcoKpi(data);
      return ok(row);
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
