export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { initMaDB, listIntercompanyTransactions, createIntercompanyTransaction } from "@/lib/ma-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initMaDB();
    const p = req.nextUrl.searchParams;
    const filters: Record<string, string> = {};
    const from_entity_id = p.get("from_entity_id");
    const to_entity_id   = p.get("to_entity_id");
    if (from_entity_id) filters.from_entity_id = from_entity_id;
    if (to_entity_id)   filters.to_entity_id   = to_entity_id;
    const rows = await listIntercompanyTransactions(filters);
    return ok(rows);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    await initMaDB();
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create") {
      if (!data.transaction_date)  return err("transaction_date required", 400);
      if (!data.from_entity_name)  return err("from_entity_name required", 400);
      if (!data.to_entity_name)    return err("to_entity_name required", 400);
      if (data.amount === undefined || data.amount === null) {
        return err("amount required", 400);
      }
      const row = await createIntercompanyTransaction(data);
      return ok(row);
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
