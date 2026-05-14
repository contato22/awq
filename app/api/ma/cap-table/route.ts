import { NextRequest, NextResponse } from "next/server";
import { initMaDB, listCapTable, createCapTableEntry } from "@/lib/ma-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initMaDB();
    const p = req.nextUrl.searchParams;
    const portco_id = p.get("portco_id");
    if (!portco_id) return err("portco_id required", 400);
    const rows = await listCapTable(portco_id);
    return ok(rows);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    await initMaDB();
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create") {
      if (!data.portco_id)        return err("portco_id required", 400);
      if (!data.shareholder_name) return err("shareholder_name required", 400);
      if (data.shares_held === undefined || data.shares_held === null) {
        return err("shares_held required", 400);
      }
      const row = await createCapTableEntry(data);
      return ok(row);
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
